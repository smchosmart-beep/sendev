import { Archive, FileText, Table, type LucideIcon } from "lucide-react";

// Maps a file name (or extension) to an appropriate Lucide icon so attachments
// render with a recognizable type: documents, spreadsheets, archives, etc.
export function getFileIcon(fileNameOrExt: string): LucideIcon {
  const ext = (fileNameOrExt.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1] ?? fileNameOrExt)
    .toLowerCase();
  switch (ext) {
    case "xls":
    case "xlsx":
    case "csv":
      return Table;
    case "zip":
    case "rar":
    case "7z":
      return Archive;
    case "hwp":
    case "hwpx":
    case "pdf":
    case "doc":
    case "docx":
    case "ppt":
    case "pptx":
    default:
      return FileText;
  }
}
