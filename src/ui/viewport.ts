import { useEffect } from 'react';
/** Safari visual viewport follows the keyboard and browser chrome without resizing document data. */
export function useVisualViewport(){useEffect(()=>{
 const viewport=window.visualViewport;
 const resize=()=>{document.documentElement.style.setProperty('--studio-height',`${viewport?.height??window.innerHeight}px`);document.documentElement.style.setProperty('--studio-top',`${viewport?.offsetTop??0}px`);const active=document.activeElement;if(active instanceof HTMLElement&&active.matches('input,select,textarea')&&active.closest('.panel,.generator-dialog'))requestAnimationFrame(()=>active.scrollIntoView({block:'nearest',inline:'nearest'}));};
 const focus=(event:FocusEvent)=>{const element=event.target;if(element instanceof HTMLElement&&element.matches('input,select,textarea,[contenteditable=true]')&&element.closest('.panel,.generator-dialog'))requestAnimationFrame(()=>element.scrollIntoView({block:'nearest',inline:'nearest'}));};
 resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);document.addEventListener('focusin',focus);
 return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);document.removeEventListener('focusin',focus);document.documentElement.style.removeProperty('--studio-height');document.documentElement.style.removeProperty('--studio-top');};
 },[]);}
