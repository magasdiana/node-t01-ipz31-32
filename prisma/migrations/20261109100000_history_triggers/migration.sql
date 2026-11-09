
-- Історія змін (FR-34–FR-36).
-- Записи історії незмінні: UPDATE та DELETE заборонені.
-- Міграція призначена для застосування один раз до бази,
-- у якій таблиця history та ці тригери ще не створені.

CREATE TABLE "history" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "history_pkey" PRIMARY KEY ("id")
);

-- Перетворення назви таблиці на назву сутності API.
CREATE FUNCTION history_entity_name(tbl text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE tbl
    WHEN 'rooms' THEN 'room'
    WHEN 'groups' THEN 'group'
    WHEN 'children' THEN 'child'
    WHEN 'staff' THEN 'staff'
    WHEN 'subjects' THEN 'subject'
    WHEN 'staff_subjects' THEN 'staffSubject'
    WHEN 'lessons' THEN 'lesson'
    WHEN 'payments' THEN 'payment'
    WHEN 'price_settings' THEN 'priceSettings'
    WHEN 'price_history' THEN 'priceHistory'
    ELSE tbl
  END
$$;

-- Перетворення ключів верхнього рівня:
-- group_id -> groupId, staff_id -> staffId тощо.
CREATE FUNCTION history_camel(j jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      split_part(t.k, '_', 1) ||
      COALESCE(
        (
          SELECT string_agg(
            upper(left(p, 1)) || substr(p, 2),
            '' ORDER BY ord
          )
          FROM unnest(
            (string_to_array(t.k, '_'))[2:]
          ) WITH ORDINALITY AS parts(p, ord)
        ),
        ''
      ),
      t.v
    ),
    '{}'::jsonb
  )
  FROM jsonb_each(j) AS t(k, v)
$$;

-- Рекурсивне маскування паролів і токенів.
CREATE FUNCTION history_mask(rec jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result jsonb;
  field_key text;
  field_value jsonb;
BEGIN
  IF rec IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(rec) = 'array' THEN
    SELECT COALESCE(
      jsonb_agg(history_mask(elem) ORDER BY ord),
      '[]'::jsonb
    )
    INTO result
    FROM jsonb_array_elements(rec)
      WITH ORDINALITY AS arr(elem, ord);

    RETURN result;
  END IF;

  IF jsonb_typeof(rec) = 'object' THEN
    result := '{}'::jsonb;

    FOR field_key, field_value IN
      SELECT k, v
      FROM jsonb_each(rec) AS fields(k, v)
    LOOP
      result := result || jsonb_build_object(
        field_key,
        CASE
          WHEN field_key IN (
            'passwordHash',
            'password',
            'token'
          )
          THEN '"***"'::jsonb
          ELSE history_mask(field_value)
        END
      );
    END LOOP;

    RETURN result;
  END IF;

  RETURN rec;
END
$$;

-- Визначення полів, які змінилися.
CREATE FUNCTION history_changed_fields(
  old_j jsonb,
  new_j jsonb
)
RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    jsonb_agg(k ORDER BY k),
    '[]'::jsonb
  )
  FROM jsonb_object_keys(
    COALESCE(old_j, '{}'::jsonb) ||
    COALESCE(new_j, '{}'::jsonb)
  ) AS keys(k)
  WHERE (old_j -> k) IS DISTINCT FROM (new_j -> k)
$$;

-- Автоматичне створення запису історії.
-- AFTER-тригер працює в транзакції основної операції.
CREATE FUNCTION history_log()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  old_j jsonb := NULL;
  new_j jsonb := NULL;
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

    old_j := history_mask(
      history_camel(to_jsonb(OLD))
    );

    new_j := history_mask(
      history_camel(to_jsonb(NEW))
    );

    -- Не записуємо історію, якщо дані не змінилися.
    IF old_j = new_j THEN
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
          THEN history_changed_fields(old_j, new_j)
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

-- Заборона редагування та видалення історії.
CREATE FUNCTION history_forbid_change()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Записи історії незмінні: % заборонено',
    TG_OP;
END
$$;

CREATE TRIGGER history_immutable
BEFORE UPDATE OR DELETE ON "history"
FOR EACH ROW
EXECUTE FUNCTION history_forbid_change();

-- Автоматичні тригери для всіх предметних таблиць.
-- Таблицю history не включаємо, щоб уникнути рекурсії.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rooms',
    'groups',
    'children',
    'staff',
    'subjects',
    'staff_subjects',
    'lessons',
    'payments',
    'price_settings',
    'price_history'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW
       EXECUTE FUNCTION history_log()',
      'history_audit_' || t,
      t
    );
  END LOOP;
END
$$;
