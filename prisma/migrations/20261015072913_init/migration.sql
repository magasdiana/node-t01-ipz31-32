-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER,
    "data" JSONB NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER,
    "data" JSONB NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
