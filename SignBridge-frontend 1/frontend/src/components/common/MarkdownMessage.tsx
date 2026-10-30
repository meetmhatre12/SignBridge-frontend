import React from 'react';

function inlineFormat(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[0.9em]">{part.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(<Tag key={`list-${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1.5 my-2`}>{list.items.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}</Tag>);
    list = null;
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }

    const signImage = line.match(/^\[\[SIGN_IMAGE:([A-Z])\]\]$/i);
    if (signImage) {
      flushList();
      const letter = signImage[1].toUpperCase();
      blocks.push(<div key={index} className="my-3 flex justify-center"><img src={`${import.meta.env.BASE_URL}signs/alphabets/${letter.toLowerCase()}.jpg`} alt={`ISL alphabet ${letter} reference`} className="w-40 h-40 sm:w-48 sm:h-48 object-contain rounded-2xl bg-white border border-slate-200 p-2 shadow-sm" /></div>);
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flushList(); const level = heading[1].length; const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'; blocks.push(<Tag key={index} className={`${level === 1 ? 'text-base' : 'text-sm'} font-extrabold text-slate-900 dark:text-white mt-3 mb-1.5`}>{inlineFormat(heading[2])}</Tag>); return; }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((bullet || numbered)![1]);
      return;
    }
    if (line.startsWith('>')) { flushList(); blocks.push(<blockquote key={index} className="my-2 pl-3 border-l-2 border-cyan-500 text-slate-600 dark:text-slate-300 italic">{inlineFormat(line.replace(/^>\s?/, ''))}</blockquote>); return; }
    flushList();
    blocks.push(<p key={index} className="my-1.5">{inlineFormat(line)}</p>);
  });
  flushList();

  return <div className="text-sm leading-6 break-words">{blocks}</div>;
};
