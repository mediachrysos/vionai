import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2 } from "lucide-react";

export default function ProfilePhotoUpload({ user, isAdminView, size = "w-10 h-10" }) {
  const inputRef = useRef(null);
  const [photo, setPhoto] = useState(user?.profile_photo || "");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (isAdminView && user?.id) {
      await base44.entities.User.update(user.id, { profile_photo: file_url });
    } else {
      await base44.auth.updateMe({ profile_photo: file_url });
    }
    setPhoto(file_url);
    setUploading(false);
    e.target.value = "";
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`relative ${size} rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden group`}
    >
      {photo ? (
        <img src={photo} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        (user?.nickname || user?.full_name || "?")[0].toUpperCase()
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-white" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  );
}