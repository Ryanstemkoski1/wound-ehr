-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_facilities" (
    "user_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_facilities_pkey" PRIMARY KEY ("user_id","facility_id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "mrn" TEXT NOT NULL,
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "insurance_info" JSONB,
    "emergency_contact" JSONB,
    "allergies" JSONB,
    "medical_history" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wounds" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "wound_number" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "wound_type" TEXT NOT NULL,
    "onset_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "visit_type" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "number_of_addenda" INTEGER NOT NULL DEFAULT 0,
    "follow_up_type" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "follow_up_notes" TEXT,
    "time_spent" BOOLEAN NOT NULL DEFAULT false,
    "additional_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "wound_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "wound_type" TEXT,
    "pressure_stage" TEXT,
    "healing_status" TEXT,
    "at_risk_reopening" BOOLEAN,
    "length" DECIMAL(5,2),
    "width" DECIMAL(5,2),
    "depth" DECIMAL(5,2),
    "area" DECIMAL(7,2),
    "undermining" TEXT,
    "tunneling" TEXT,
    "epithelial_percent" INTEGER,
    "granulation_percent" INTEGER,
    "slough_percent" INTEGER,
    "exudate_amount" TEXT,
    "exudate_type" TEXT,
    "odor" TEXT,
    "periwound_condition" TEXT,
    "pain_level" INTEGER,
    "infection_signs" JSONB,
    "assessment_notes" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "primary_dressings" JSONB,
    "secondary_dressings" JSONB,
    "antimicrobials" JSONB,
    "debridement" JSONB,
    "advanced_therapies" JSONB,
    "compression" JSONB,
    "moisture_management" JSONB,
    "npwt_pressure" INTEGER,
    "npwt_frequency" TEXT,
    "preventive_orders" JSONB,
    "chair_cushion_type" TEXT,
    "frequency_days" INTEGER,
    "prn" BOOLEAN NOT NULL DEFAULT false,
    "treatment_orders" TEXT,
    "special_instructions" TEXT,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "wound_id" UUID NOT NULL,
    "visit_id" UUID,
    "assessment_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "caption" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billings" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cpt_codes" JSONB NOT NULL,
    "icd10_codes" JSONB NOT NULL,
    "modifiers" JSONB,
    "time_spent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "patients_facility_id_idx" ON "patients"("facility_id");

-- CreateIndex
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_facility_id_mrn_key" ON "patients"("facility_id", "mrn");

-- CreateIndex
CREATE INDEX "wounds_patient_id_idx" ON "wounds"("patient_id");

-- CreateIndex
CREATE INDEX "wounds_status_idx" ON "wounds"("status");

-- CreateIndex
CREATE INDEX "visits_patient_id_idx" ON "visits"("patient_id");

-- CreateIndex
CREATE INDEX "visits_visit_date_idx" ON "visits"("visit_date");

-- CreateIndex
CREATE INDEX "assessments_visit_id_idx" ON "assessments"("visit_id");

-- CreateIndex
CREATE INDEX "assessments_wound_id_idx" ON "assessments"("wound_id");

-- CreateIndex
CREATE INDEX "treatments_visit_id_idx" ON "treatments"("visit_id");

-- CreateIndex
CREATE INDEX "photos_wound_id_idx" ON "photos"("wound_id");

-- CreateIndex
CREATE INDEX "photos_visit_id_idx" ON "photos"("visit_id");

-- CreateIndex
CREATE INDEX "photos_assessment_id_idx" ON "photos"("assessment_id");

-- CreateIndex
CREATE INDEX "photos_uploaded_by_idx" ON "photos"("uploaded_by");

-- CreateIndex
CREATE INDEX "billings_visit_id_idx" ON "billings"("visit_id");

-- CreateIndex
CREATE INDEX "billings_patient_id_idx" ON "billings"("patient_id");

-- AddForeignKey
ALTER TABLE "user_facilities" ADD CONSTRAINT "user_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facilities" ADD CONSTRAINT "user_facilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wounds" ADD CONSTRAINT "wounds_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_wound_id_fkey" FOREIGN KEY ("wound_id") REFERENCES "wounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_wound_id_fkey" FOREIGN KEY ("wound_id") REFERENCES "wounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
