import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateNoticeProps {
  label: string;
  text: string;
  className?: string;
}

export function TemplateNotice({ label, text, className }: TemplateNoticeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("템플릿을 복사했어요!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사에 실패했어요. 직접 드래그해서 복사해 주세요.");
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-primary/10 text-primary-foreground",
        className,
      )}
    >
      <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
        {label}
      </div>
      <div className="absolute right-2 top-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          className="h-7 gap-1 rounded-lg px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              복사
            </>
          )}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-words px-4 pb-4 pt-9 font-mono text-sm leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}
