import { 
  Wrench, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Sparkles 
} from 'lucide-react';

export const maskId = (id: string): string => {
  if (!id) return '';
  const len = id.length;
  if (len <= 2) {
    return '*'.repeat(len);
  }
  if (len === 3) {
    return id[0] + '*' + id[2];
  }
  if (len === 4) {
    return id[0] + '**' + id[3];
  }
  return id.slice(0, 2) + '*'.repeat(len - 4) + id.slice(-2);
};

export const formatModalMessage = (message: string) => {
  if (!message) return '';
  const parts = message.split(/(\[[^\]]+\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const text = part.slice(1, -1);
      return (
        <span key={index} className="text-zinc-100 font-semibold">
          {text}
        </span>
      );
    }
    return part;
  });
};

export const formatEditionName = (ed: string) => {
  if (!ed) return '';
  const e = ed.toLowerCase();
  if (e === 'dlc' || e === 'all_dlc') return 'All DLC';
  if (e === 'standard') return 'Standard Edition';
  return ed;
};

export const getModalIcon = (type: string, title: string) => {
  const t = title.toLowerCase();
  if (type === 'patch_choice' || t.includes('patch') || t.includes('แพทช์')) {
    return <Wrench className="w-5 h-5 text-white" />;
  }
  if (t.includes('ลบ') || t.includes('delete') || t.includes('remove')) {
    return <Trash2 className="w-5 h-5 text-white" />;
  }
  if (t.includes('สำเร็จ') || t.includes('success')) {
    return <CheckCircle2 className="w-5 h-5 text-white" />;
  }
  if (t.includes('ข้อผิดพลาด') || t.includes('ผิดพลาด') || t.includes('error') || t.includes('เตือน') || t.includes('เพิกถอน') || t.includes('ไม่สำเร็จ')) {
    return <AlertTriangle className="w-5 h-5 text-white" />;
  }
  if (t.includes('รีดีม') || t.includes('คีย์') || t.includes('redeem')) {
    return <Key className="w-5 h-5 text-white" />;
  }
  return <Sparkles className="w-5 h-5 text-white" />;
};
