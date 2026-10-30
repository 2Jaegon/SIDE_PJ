// 첨부 이미지: 브라우저에서 줄여서(긴 변 1600px, JPEG) 서버로 보낸다. 서버는 png·jpg·webp·gif에 한 장 5MB까지 받는다.
export interface Attachment {
  id: string;
  url: string; // 화면에 보여 줄 data URL
  mime: string; // 서버로 보내는 형식
  data: string; // base64 (접두사 없음)
}

// 대화에 남은 data URL을 다시 보낼 첨부로 되돌린다(다시 생성·질문 수정)
export const fromDataUrl = (url: string, i: number): Attachment => {
  const m = url.match(/^data:([^;]+);base64,(.*)$/);
  return { id: `again-${i}`, url, mime: m ? m[1] : 'image/jpeg', data: m ? m[2] : '' };
};

export const MAX_ATTACHMENTS = 4;
export const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const MAX_SIDE = 1600;

const load = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('이미지를 읽지 못했어요.'));
    };
    img.src = src;
  });

export const toAttachment = async (file: File): Promise<Attachment> => {
  if (!ACCEPT.split(',').includes(file.type)) throw new Error('png, jpg, webp, gif 이미지만 첨부할 수 있어요.');
  const img = await load(file);
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리하지 못했어요.');
  ctx.fillStyle = '#ffffff'; // 투명한 곳이 JPEG에서 검게 나오지 않게
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, mime: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
};
