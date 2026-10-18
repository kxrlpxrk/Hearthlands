/** Optional, informational origin. It never grants permission to replace an object. */
export interface Provenance {version:1;source:'district-development'|'settlement-expansion';districtId:string;seed:number;proposalId:string;replaces?:string}
