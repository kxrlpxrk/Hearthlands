import type {RasterPresentation,VectorArtwork} from './types';
/** Small colour-matched roof/yard symbols, not replacement PNG artwork. Geometry
 * stays inside the alpha-fitted image rectangle; no extra shadows or backgrounds. */
const cottage:VectorArtwork={format:'vector',viewBox:[0,0,140,100],paths:[
 {data:'M5 20L14 6H126L135 20V80L126 94H14L5 80Z',fill:'#b87e58',stroke:'#473222',width:3,level:'mass'},
 {data:'M14 8L36 50L14 92M126 8L104 50L126 92M36 50H104M70 8V92',fill:'none',stroke:'#edc389',width:4,level:'structure'},
 {data:'M46 69L70 49L94 69V92H46Z',fill:'#80533a',stroke:'#edc389',width:3,level:'structure'},
]};
const tavern:VectorArtwork={format:'vector',viewBox:[0,0,178,100],paths:[
 {data:'M18 20L28 7H145L157 20V39H173V84H151L142 94H28L18 82Z',fill:'#ae7154',stroke:'#473222',width:3,level:'mass'},
 {data:'M28 10L48 48L28 90M144 10L124 48L144 90M48 48H124M86 9V91M156 43V81',fill:'none',stroke:'#edc389',width:4,level:'structure'},
 {data:'M57 72L85 51L113 72V94H57Z',fill:'#80533a',stroke:'#edc389',width:3,level:'structure'},
 {data:'M4 22H18V50H4ZM22 62H54V78H22Z',fill:'#d29a6c',stroke:'#473222',width:3,level:'structure'},
]};
const farm:VectorArtwork={format:'vector',viewBox:[0,0,178,100],paths:[
 {data:'M4 5H174V95H4Z',fill:'#807845',stroke:'#e2bf80',width:4,level:'mass'},
 {data:'M12 17H47V83H12Z',fill:'#5c7437',stroke:'#433a29',width:3,level:'structure'},
 {data:'M58 18H91V83H58Z',fill:'#d2b260',stroke:'#433a29',width:3,level:'structure'},
 {data:'M101 38H163V83H101Z',fill:'#7c913e',stroke:'#433a29',width:3,level:'structure'},
 {data:'M102 9H154L165 22H95ZM101 23H160V34H101Z',fill:'#b57c56',stroke:'#493728',width:3,level:'structure'},
 {data:'M27 24V76M72 25V76M116 46V77M145 46V77',fill:'none',stroke:'#e2bf80',width:3,level:'structure'},
]};
/** Larger experiments (1.45/1.35/1.20) exceed occupied footprints. These final
 * multipliers use the available inset only; the fitter still caps extreme sizes. */
export const pilotPresentations:Readonly<Partial<Record<string,RasterPresentation>>>={
 cottage:{version:1,scale:1.06,bounds:{x:0,y:0,width:1,height:1},overview:cottage},
 tavern:{version:1,scale:1.04,bounds:{x:0,y:0,width:1,height:1},overview:tavern},
 farm:{version:1,scale:1.03,bounds:{x:0,y:0,width:1,height:1},overview:farm},
};
