import { z } from "zod";

const FILE_FIELD = "package" as const;
const PACKAGE_TYPE_FIELD = "packageType" as const;
const ALLOWED_PACKAGE_TYPES = ["auto", "h5p", "scorm"] as const;
type PackageTypeSelection = (typeof ALLOWED_PACKAGE_TYPES)[number];

const fileInputSchema = z.custom<File>(
  (value): value is File =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function",
  { message: "Upload a .h5p or .zip package." }
);

const packageTypeSchema = z
  .custom<PackageTypeSelection>(
    (value): value is PackageTypeSelection =>
      typeof value === "string" && ALLOWED_PACKAGE_TYPES.includes(value as PackageTypeSelection),
    { message: "Invalid package type selection." }
  )
  .optional()
  .default("auto");

const UploadFormSchema = z.object({
  package: fileInputSchema,
  packageType: packageTypeSchema
});

export type UploadFormFields = z.infer<typeof UploadFormSchema>;

export function parseUploadFormData(formData: FormData): UploadFormFields {
  const packageField = formData.get(FILE_FIELD);
  const packageTypeField = formData.get(PACKAGE_TYPE_FIELD);

  return UploadFormSchema.parse({
    package: packageField ?? undefined,
    packageType:
      typeof packageTypeField === "string" ? packageTypeField : undefined
  });
}

export { FILE_FIELD, PACKAGE_TYPE_FIELD };

