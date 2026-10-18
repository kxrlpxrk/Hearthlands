import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export const compactQuery='(max-width: 650px), (max-width: 1000px) and (max-height: 500px)';
export const isCompactViewport=()=>window.matchMedia(compactQuery).matches;
export type OpenPanel='library'|'properties'|null;
type Place='library'|'properties'|'map';
export function actionDestination(compact:boolean,panel:OpenPanel):Place{return compact&&panel?panel:'map';}
const Context=createContext<{panel:OpenPanel;compact:boolean;slots:React.MutableRefObject<Partial<Record<Place,HTMLDivElement>>>}|null>(null);
export function ActionDockProvider({panel,children}:{panel:OpenPanel;children:ReactNode}){
 const [compact,setCompact]=useState(isCompactViewport),slots=useRef<Partial<Record<Place,HTMLDivElement>>>({});
 useEffect(()=>{const query=window.matchMedia(compactQuery),change=()=>setCompact(query.matches);query.addEventListener('change',change);change();return()=>query.removeEventListener('change',change);},[]);
 return <Context.Provider value={{panel,compact,slots}}>{children}</Context.Provider>;
}
export function useActionLayout(){const context=useContext(Context);if(!context)throw new Error('Action dock requires studio layout.');return context;}
export function ActionSlot({place}:{place:Place}){const {slots}=useActionLayout();return <div className={place==='map'?'map-action-slot':'sheet-action-slot'} data-action-slot={place} ref={node=>{if(node)slots.current[place]=node;else delete slots.current[place];}}/>;}
/** Move one stable portal host, preserving confirmations and errors across sheet/camera changes. */
export function ActionDock({children}:{children:ReactNode}){
 const {panel,compact,slots}=useActionLayout(),destination=actionDestination(compact,panel);
 const [host]=useState(()=>{const node=document.createElement('div');node.className='tool-actions';return node;});
 useLayoutEffect(()=>{const target=slots.current[destination];target?.append(host);if(destination!=='map'&&host.hasChildNodes())target?.scrollIntoView({block:'start',inline:'nearest'});return()=>host.remove();},[destination,host,slots]);
 return createPortal(children,host);
}
