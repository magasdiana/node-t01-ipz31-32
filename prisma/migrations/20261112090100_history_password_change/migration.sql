-- Історія: зміна пароля має лишати слід.
--
-- Проблема: history_log() порівнювала знімки ПІСЛЯ маскування. У users і старий,
-- і новий passwordHash маскуються як "***", тож знімки збігаються, і запис про
-- зміну пароля (лише хеш) в історію не потрапляв.
--
-- Виправлення (дві зміни відносно 20261109100000_history_triggers):
--   1. «чи змінилися дані» перевіряємо за ЗНІМКАМИ БЕЗ маскування (old_raw/new_raw);
--   2. changedFields рахуємо за ними ж. Це ключі верхнього рівня (наприклад "data"),
--      значень вони не містять, тож хеш не витікає. У самих знімках changes.before/after
--      passwordHash, як і раніше, "***".
-- Поведінка для інших таблиць не змінюється: без маскування знімки різняться
-- тоді й лише тоді, коли різняться замасковані.
--
-- Міграція не обов'язкова для роботи авторизації. Якщо Аліна також переписує
-- history_log(), хай перенесе ці дві зміни до себе й видалить цю міграцію.

CREATE OR REPLACE FUNCTION history_log()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  old_j jsonb := NULL;
  new_j jsonb := NULL;
  old_raw jsonb := NULL;
  new_raw jsonb := NULL;
  act text;
  request_id text;
  actor_json jsonb;
  source_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'create';
    new_j := history_mask(
      history_camel(to_jsonb(NEW))
    );

  ELSIF TG_OP = 'UPDATE' THEN
    act := 'update';

    old_raw := history_camel(to_jsonb(OLD));
    new_raw := history_camel(to_jsonb(NEW));

    old_j := history_mask(old_raw);
    new_j := history_mask(new_raw);

    -- Не записуємо історію, якщо дані не змінилися (порівняння без маскування).
    IF old_raw = new_raw THEN
      RETURN NULL;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    act := 'delete';

    old_j := history_mask(
      history_camel(to_jsonb(OLD))
    );
  END IF;

  -- Контекст передається застосунком через
  -- SET LOCAL / set_config(..., true).
  request_id := NULLIF(
    current_setting('app.request_id', true),
    ''
  );

  actor_json := NULLIF(
    current_setting('app.actor', true),
    ''
  )::jsonb;

  source_name := COALESCE(
    NULLIF(current_setting('app.source', true), ''),
    'api'
  );

  -- Ідентифікатор транзакції використовується як fallback.
  request_id := COALESCE(
    request_id,
    txid_current()::text
  );

  INSERT INTO "history" ("data")
  VALUES (
    jsonb_build_object(
      'entity',
        history_entity_name(TG_TABLE_NAME),

      'entityId',
        COALESCE(
          new_j ->> 'id',
          old_j ->> 'id'
        )::integer,

      'action',
        act,

      'changes',
        jsonb_build_object(
          'before', old_j,
          'after', new_j
        ),

      'changedFields',
        CASE
          WHEN act = 'update'
          THEN history_changed_fields(old_raw, new_raw)
          ELSE '[]'::jsonb
        END,

      'createdAt',
        to_char(
          clock_timestamp() AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ),

      'requestId',
        request_id,

      'actor',
        actor_json,

      'source',
        source_name
    )
  );

  RETURN NULL;
END
$$;
