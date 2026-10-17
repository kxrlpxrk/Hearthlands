export function fileName(name: string, extension: string) { return `${(name.trim() || 'settlement').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,120)}.${extension}`; }
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href=url; link.download=name; document.body.append(link); link.click(); link.remove();
  // Safari may begin reading the object URL after the click handler completes.
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
