import { useEffect, useRef, type ReactNode } from 'react';
export function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
  const root=useRef<HTMLElement>(null),previous=useRef<HTMLElement|null>(null);
  useEffect(()=>{previous.current=document.activeElement as HTMLElement;root.current?.focus();return()=>previous.current?.focus();},[]);
  return <div className="modal-backdrop"><section ref={root} tabIndex={-1} className="generator-dialog project-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{
    if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}
    if(e.key==='Tab'){const nodes=Array.from(root.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]'));const first=nodes[0],last=nodes[nodes.length-1];if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===root.current)){e.preventDefault();first.focus();}}
  }}><div className="panel-heading"><div><span className="eyebrow">YOUR LOCAL WORKSPACE</span><h2>{title}</h2></div><button aria-label={`Close ${title}`} disabled={busy} onClick={onClose}>×</button></div>{children}</section></div>;
}
