import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectDatabase, ProjectRepository, SaveConflictError } from './database';
import { createDocument } from '../model/document';
import { placeBuilding, paintTerrain } from '../model/operations';
const databases:ProjectDatabase[]=[];
function setup(){const db=new ProjectDatabase(`hearthlands-test-${crypto.randomUUID()}`);databases.push(db);return {db,repo:new ProjectRepository(db)};}
afterEach(async()=>{vi.restoreAllMocks();for(const db of databases.splice(0))await db.delete();});
describe('project repository and migration',()=>{
  it('migrates the existing single saved settlement without changing geometry or identity',async()=>{
    const {db,repo}=setup(),old=new Dexie(db.name);old.version(1).stores({documents:'id'});
    const legacy={...createDocument(),version:1,buildings:[{id:'original-building',kind:'longhouse',x:4,y:7,layerId:'settlement'}]};
    await old.table('documents').put(legacy);old.close();
    expect((await repo.list()).map(p=>p.id)).toEqual(['hearthlands-local']);expect(await repo.activeId()).toBe('hearthlands-local');
    const loaded=await repo.load('hearthlands-local');expect(loaded.document.buildings[0]).toMatchObject({id:'original-building',x:4,y:7,width:1,height:1,rotation:0});expect((await db.documents.get('hearthlands-local'))?.version).toBe(1);
  });
  it('isolates two projects, keeps duplicate building identities, and rejects stale revisions',async()=>{
    const {repo}=setup();const source=placeBuilding(createDocument(),{x:3,y:4},'longhouse','hall');const a=await repo.create(source),b=await repo.create({...source,name:'Second'});
    expect(a.document.id).not.toBe(b.document.id);await expect(repo.save(b.document,0,a.document.id)).rejects.toThrow('identity changed');expect(b.document.buildings).toEqual(a.document.buildings);
    await repo.save({...a.document,name:'Edited A'},0);await expect(repo.save({...a.document,name:'Stale'},0)).rejects.toBeInstanceOf(SaveConflictError);
    expect((await repo.load(a.document.id)).document.name).toBe('Edited A');expect((await repo.load(b.document.id)).document.name).toBe('Second');
    await repo.setActive(b.document.id);await repo.remove(a.document.id);expect((await repo.load(b.document.id)).document.buildings[0].id).toBe('hall');await expect(repo.save(a.document,1)).rejects.toThrow('deleted');
  });
  it('restores exact named snapshot geometry with an automatic backup and project boundary checks',async()=>{
    const {repo}=setup();const document=paintTerrain(placeBuilding(createDocument(),{x:5,y:8},'cottage','home'),{x:1,y:1},'water');document.roads=[{id:'path',layerId:'settlement',points:[{x:5,y:10},{x:6,y:10}]}];
    const a=await repo.create(document),b=await repo.create(document),snapshot=await repo.snapshot(a.document.id,'Before move');const moved={...a.document,name:'Moved',buildings:a.document.buildings.map(x=>({...x,x:20,rotation:90,width:7}))};await repo.save(moved,0);
    await expect(repo.restore(b.document.id,snapshot.id,0)).rejects.toThrow('does not belong');
    const restored=await repo.restore(a.document.id,snapshot.id,1);expect(restored.document).toEqual(a.document);expect(restored.revision).toBe(2);
    const backups=await repo.snapshotsFor(a.document.id);expect(backups).toHaveLength(2);expect(backups.find(x=>x.name.startsWith('Automatic'))?.document).toEqual(moved);
    await repo.setActive(b.document.id);await repo.remove(a.document.id);expect(await repo.snapshotsFor(a.document.id)).toEqual([]);expect(await repo.load(b.document.id)).toBeDefined();
  });
  it('rolls back failed writes and keeps active selection after reopening the database',async()=>{
    const {db,repo}=setup();const a=await repo.create(createDocument());await repo.setActive(a.document.id);
    vi.spyOn(db.documents,'put').mockRejectedValueOnce(new Error('Quota exceeded'));await expect(repo.save({...a.document,name:'Lost write'},0)).rejects.toThrow('Quota');expect((await repo.load(a.document.id)).meta.revision).toBe(0);expect((await repo.load(a.document.id)).document).toEqual(a.document);
    db.close();await db.open();expect(await repo.activeId()).toBe(a.document.id);expect((await repo.load(a.document.id)).document).toEqual(a.document);
  });
});
