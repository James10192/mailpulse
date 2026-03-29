import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { CsvImport } from "./csv-import";

export default function ImportContactsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Contacts", href: "/dashboard/contacts" },
          { label: "Importer CSV" },
        ]}
      />
      <CsvImport />
    </>
  );
}
