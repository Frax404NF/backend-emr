-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A', 'B', 'AB', 'O');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Laki_laki', 'Perempuan');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('IGD', 'Rawat_Jalan', 'Rawat_Inap');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('Merah', 'Kuning', 'Hijau', 'Hitam');

-- CreateEnum
CREATE TYPE "PatientPosition" AS ENUM ('Berdiri', 'Duduk', 'Berbaring');

-- CreateEnum
CREATE TYPE "DispositionStatusType" AS ENUM ('Pulang', 'Dirujuk', 'Rawat_Inap', 'Meninggal');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('Dokter', 'Perawat', 'Admin');

-- CreateEnum
CREATE TYPE "ExaminationType" AS ENUM ('Laboratorium', 'Radiologi', 'Penunjang_Lain');

-- CreateTable
CREATE TABLE "Patients" (
    "patient_id" UUID NOT NULL,
    "patient_name" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "blood_type" "BloodType",
    "gender" "Gender" NOT NULL,
    "patient_history_of_allergies" TEXT,
    "phone_number" TEXT NOT NULL,
    "patient_disease_history" TEXT,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phonenumber" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "medical_record_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("medical_record_id")
);

-- CreateTable
CREATE TABLE "MedicStaff" (
    "staff_id" UUID NOT NULL,
    "auth_user_id" UUID,
    "staff_name" TEXT NOT NULL,
    "staff_email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,

    CONSTRAINT "MedicStaff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "encounter_id" UUID NOT NULL,
    "medical_record_id" UUID NOT NULL,
    "encounter_type" "EncounterType" NOT NULL,
    "encounter_start_time" TIMESTAMPTZ NOT NULL,
    "encounter_end_time" TIMESTAMPTZ,
    "chief_complaint" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "triage_level" "TriageLevel",
    "ward_bed" TEXT,
    "responsible_staff_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("encounter_id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "diagnosis_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "diagnosis_code" TEXT NOT NULL,
    "diagnosis_description" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "doctor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("diagnosis_id")
);

-- CreateTable
CREATE TABLE "Icd10" (
    "diagnosis_code" TEXT NOT NULL,
    "diagnosis_description" TEXT NOT NULL,

    CONSTRAINT "Icd10_pkey" PRIMARY KEY ("diagnosis_code")
);

-- CreateTable
CREATE TABLE "SoapNote" (
    "soap_note_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "responsible_staff_id" UUID NOT NULL,
    "last_updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoapNote_pkey" PRIMARY KEY ("soap_note_id")
);

-- CreateTable
CREATE TABLE "VitalSign" (
    "vital_sign_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "height" DECIMAL(5,2),
    "weight" DECIMAL(5,2),
    "body_temperature" DECIMAL(4,2),
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "pulse_oximetry" INTEGER,
    "position" "PatientPosition",
    "responsible_staff_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("vital_sign_id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "treatment_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "responsible_staff_id" UUID NOT NULL,
    "treatment_type" TEXT NOT NULL,
    "procedure_description" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("treatment_id")
);

-- CreateTable
CREATE TABLE "DischargeInformation" (
    "discharge_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "discharge_summary" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "follow_ups" TEXT,
    "approved_staff_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DischargeInformation_pkey" PRIMARY KEY ("discharge_id")
);

-- CreateTable
CREATE TABLE "DoctorSpecialization" (
    "specialization_id" SERIAL NOT NULL,
    "staff_id" UUID NOT NULL,
    "specialization_name" TEXT NOT NULL,

    CONSTRAINT "DoctorSpecialization_pkey" PRIMARY KEY ("specialization_id")
);

-- CreateTable
CREATE TABLE "DispositionStatus" (
    "disposition_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "disposition_status" "DispositionStatusType" NOT NULL,
    "timestamp_disposition" TIMESTAMPTZ NOT NULL,
    "approved_staff_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispositionStatus_pkey" PRIMARY KEY ("disposition_id")
);

-- CreateTable
CREATE TABLE "DiagnosticTest" (
    "diagnostictests_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "type_examination" "ExaminationType" NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "requested_examinations" TEXT NOT NULL,
    "result_summary" TEXT,
    "attachments" TEXT,
    "responsible_staff_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticTest_pkey" PRIMARY KEY ("diagnostictests_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patients_nik_key" ON "Patients"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_patient_id_key" ON "MedicalRecord"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "MedicStaff_auth_user_id_key" ON "MedicStaff"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MedicStaff_staff_email_key" ON "MedicStaff"("staff_email");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeInformation_encounter_id_key" ON "DischargeInformation"("encounter_id");

-- CreateIndex
CREATE UNIQUE INDEX "DispositionStatus_encounter_id_key" ON "DispositionStatus"("encounter_id");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patients"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("medical_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_responsible_staff_id_fkey" FOREIGN KEY ("responsible_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_diagnosis_code_fkey" FOREIGN KEY ("diagnosis_code") REFERENCES "Icd10"("diagnosis_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_responsible_staff_id_fkey" FOREIGN KEY ("responsible_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "MedicStaff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_responsible_staff_id_fkey" FOREIGN KEY ("responsible_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_responsible_staff_id_fkey" FOREIGN KEY ("responsible_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeInformation" ADD CONSTRAINT "DischargeInformation_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DischargeInformation" ADD CONSTRAINT "DischargeInformation_approved_staff_id_fkey" FOREIGN KEY ("approved_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialization" ADD CONSTRAINT "DoctorSpecialization_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositionStatus" ADD CONSTRAINT "DispositionStatus_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositionStatus" ADD CONSTRAINT "DispositionStatus_approved_staff_id_fkey" FOREIGN KEY ("approved_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticTest" ADD CONSTRAINT "DiagnosticTest_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "Encounter"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticTest" ADD CONSTRAINT "DiagnosticTest_responsible_staff_id_fkey" FOREIGN KEY ("responsible_staff_id") REFERENCES "MedicStaff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;
