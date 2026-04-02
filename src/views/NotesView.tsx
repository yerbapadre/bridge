import { useEffect, useState } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function NotesView() {
  const { currentNotePath, currentNoteContent, saveNote } = useNoteStore();
  const [localContent, setLocalContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalContent(currentNoteContent);
    setHasUnsavedChanges(false);
  }, [currentNoteContent]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (currentNotePath) {
      const success = await saveNote(currentNotePath, localContent);
      if (success) {
        setHasUnsavedChanges(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  if (!currentNotePath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">No note selected</p>
          <p className="text-sm mt-2">Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{currentNotePath.split("/").pop()}</h2>
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          size="sm"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      <div className="flex-1 p-4">
        <textarea
          value={localContent}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full resize-none bg-background border rounded-md p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Start writing your note..."
        />
      </div>
    </div>
  );
}
