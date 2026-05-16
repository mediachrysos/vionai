import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NicknameSetupModal({ user, onSaved }) {
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    await base44.auth.updateMe({ nickname: nickname.trim() });
    setSaving(false);
    onSaved(nickname.trim());
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Nastav si přezdívku 👋</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Přezdívka se bude zobrazovat v aplikaci místo tvého emailu.
        </p>
        <Input
          placeholder="Např. Matyas, SuperChatter..."
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        <Button
          onClick={handleSave}
          disabled={!nickname.trim() || saving}
          className="mt-2 w-full bg-[#C9A227] hover:bg-[#A8841C] text-white"
        >
          {saving ? "Ukládám..." : "Uložit přezdívku"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}