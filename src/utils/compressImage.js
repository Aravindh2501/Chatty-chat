import imageCompression from "browser-image-compression";

export const compressImage = async (file, opts = {}) => {
  if (!file.type.startsWith("image/")) return file;

  const options = {
    maxSizeMB: 0.5,         
    maxWidthOrHeight: 1280,  
    useWebWorker: true,
    fileType: "image/webp",  
    initialQuality: 0.82,    
    ...opts,
  };

  try {
    const compressed = await imageCompression(file, options);

    const webpName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressed], webpName, { type: "image/webp" });
  } catch (err) {
    console.warn("Image compression failed, using original:", err);
    return file;
  }
};

export const compressImages = (files) =>
  Promise.all(files.map((f) => compressImage(f)));