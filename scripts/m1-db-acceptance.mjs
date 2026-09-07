import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Explicit opt-in: this test writes synthetic requests to the approved DEV only.
const root = process.env.M1_REPO_ROOT || process.cwd();
const req = createRequire(root + '/package.json');
const mod = (path) => import(pathToFileURL(root + '/' + path));
let db;
const checks = [];
async function main() {
  assert.equal(process.env.M1_DB_ACCEPTANCE, 'CONFIRMED_DEV_SYNTHETIC_WRITES');
  const cfg = JSON.parse(readFileSync(root + '/apps/api/local.settings.json', 'utf8')).Values;
  const url = cfg.DATABASE_URL;
  assert.match(url, /^sqlserver:\/\/access-management-portal-dev-sql\.database\.windows\.net:1433;/);
  assert.match(url, /;database=access-management-portal-dev;/);
  assert.match(url, /;encrypt=true;/);
  assert.match(url, /;trustServerCertificate=false;/);
  assert.equal(cfg.PORTAL_DATABASE_OWNERSHIP, 'CONFIRMED_PORTAL_OWNED');
  const { getPrismaClient } = await mod('database/dist/client.js');
  const { PrismaPortalRequestRepository } = await mod('database/dist/portal-request-repository.js');
  const { PortalRequestService } = await mod('apps/api/dist/src/services/portal-request.service.js');
  const api = await mod('apps/api/dist/src/portal/portal-request-api.js');
  const { AuthenticationService } = await mod('apps/api/dist/src/auth/authentication.js');
  const { EntraJwtAccessTokenValidator } = await mod('apps/api/dist/src/auth/token-validator.js');
  const { generateKeyPair, SignJWT } = await import(pathToFileURL(req.resolve('jose')));
  db = getPrismaClient(cfg);
  const target = await db.$queryRawUnsafe('SELECT DB_NAME() AS name');
  assert.equal(target[0].name, 'access-management-portal-dev');
  checks.push('TLS Prisma connection and exact target');
  const actor = await db.user.findUnique({where:{employeeId:'M1-SYNTHETIC-001'}});
  assert.equal(actor?.email,'m1.acceptance@example.invalid');
  const roles = await db.role.findMany({where:{system:{code:'M1-SYNTHETIC'}},orderBy:{code:'asc'}});
  assert.equal(roles.length,2);
  // Exercise the production JWT verifier with ephemeral synthetic signing keys.
  // This verifies the HTTP handler/DB path, not a live browser Entra sign-in.
  const {privateKey,publicKey}=await generateKeyPair('RS256');
  const tenant='00000000-0000-4000-8000-00000000a001';
  const issuer='https://identity.example.invalid/'+tenant;
  const validator=new EntraJwtAccessTokenValidator({tenantId:tenant,expectedIssuers:[issuer],expectedAudience:'m1-synthetic-api',jwksUri:'https://identity.example.invalid/keys'},async()=>publicKey);
  const authentication=new AuthenticationService(validator,{ENABLE_DEV_AUTH_MOCK:'false'});
  const sign=async(oid,role=['Viewer'])=>new SignJWT({oid,tid:tenant,roles:role,scp:'access_as_user',preferred_username:'m1.acceptance@example.invalid'}).setProtectedHeader({alg:'RS256'}).setIssuer(issuer).setAudience('m1-synthetic-api').setSubject('synthetic-subject').setIssuedAt().setExpirationTime('10m').sign(privateKey);
  const token=await sign(actor.entraObjectId);
  const repository=new PrismaPortalRequestRepository(db);
  const service=new PortalRequestService(repository);
  const dependencies={getAuthenticationService:()=>authentication,getPortalRequestService:()=>service};
  const request=(body={},id,authorization=token)=>({headers:new Headers(authorization?{authorization:'Bearer '+authorization}:{}),params:{id},json:async()=>body});
  const catalog=await api.handlePortalCatalog(request(),dependencies);
  assert.equal(catalog.status,200);assert.equal(catalog.jsonBody.roles.length,2);
  checks.push('Authenticated catalog');
  const created=[];
  for(const requestType of ['ADD','REMOVE','CHANGE']) {
    const body={requestType,reason:'Synthetic M1 database acceptance only',idempotencyKey:randomUUID(),...(requestType!=='ADD'?{currentRoleId:roles[0].id}:{}),...(requestType!=='REMOVE'?{requestedRoleId:roles[1].id}:{})};
    const result=await api.handlePortalRequestSubmit(request(body),dependencies);
    assert.equal(result.status,201);
    const row=result.jsonBody.request;
    assert.equal(row.status,'SUBMITTED');assert.equal(row.item.status,'PENDING');assert.equal(row.version,1);
    const replay=await api.handlePortalRequestSubmit(request(body),dependencies);
    assert.equal(replay.status,200);assert.equal(replay.jsonBody.request.id,row.id);
    const conflict=await api.handlePortalRequestSubmit(request({...body,reason:'A different synthetic reason'}),dependencies);
    assert.equal(conflict.status,409);
    const detail=await api.handlePortalRequestDetail(request({},row.id),dependencies);
    assert.equal(detail.status,200);assert.equal(detail.jsonBody.id,row.id);
    const persisted=await db.accessRequest.findUnique({where:{id:row.id},include:{items:true}});
    assert.equal(persisted.status,'SUBMITTED');assert.equal(persisted.items.length,1);assert.equal(persisted.items[0].status,'PENDING');
    assert.equal(JSON.parse(persisted.items[0].catalogSnapshot).length,requestType==='CHANGE'?2:1);
    assert.equal(await db.auditLog.count({where:{entityId:row.id,action:'ACCESS_REQUEST_SUBMITTED',correlationId:body.idempotencyKey}}),1);
    created.push(row.id);
    checks.push(requestType+' submission, detail, stored snapshot, single audit, retry and conflict');
  }
  const list=await api.handlePortalRequestList(request(),dependencies);
  assert.equal(list.status,200);assert(created.every(id=>list.jsonBody.requests.some(r=>r.id===id)));
  assert.equal((await api.handlePortalCatalog(request({},undefined,''),dependencies)).status,401);
  assert.equal((await api.handlePortalCatalog(request({},undefined,await sign(randomUUID())),dependencies)).status,403);
  assert.equal((await api.handlePortalCatalog(request({},undefined,await sign(actor.entraObjectId,[])),dependencies)).status,403);
  assert.equal(await repository.findForRequester(created[0],randomUUID()),null);
  assert.equal((await api.handlePortalRequestSubmit(request({requestType:'ADD',requestedRoleId:roles[1].id,reason:'Synthetic request invalid actor override',idempotencyKey:randomUUID(),requesterId:actor.id}),dependencies)).status,400);
  checks.push('Owned list, unauthenticated/unmapped/roleless/actor-override and cross-owner denial');
  const concurrentBody={requestType:'ADD',requestedRoleId:roles[1].id,reason:'Synthetic concurrent idempotency verification',idempotencyKey:randomUUID()};
  const concurrent=await Promise.all([api.handlePortalRequestSubmit(request(concurrentBody),dependencies),api.handlePortalRequestSubmit(request(concurrentBody),dependencies)]);
  assert(concurrent.every(r=>r.status===200||r.status===201));assert.equal(concurrent[0].jsonBody.request.id,concurrent[1].jsonBody.request.id);
  assert.equal(await db.auditLog.count({where:{correlationId:concurrentBody.idempotencyKey}}),1);
  checks.push('Concurrent idempotent retry produces one request and audit');
  const failedKey=randomUUID();
  const failingDb=new Proxy(db,{get(target,prop){if(prop==='$transaction')return fn=>target.$transaction(tx=>fn(new Proxy(tx,{get(t,p){if(p==='auditLog')return {create:async()=>{throw new Error('SYNTHETIC_AUDIT_FAILURE');}};return t[p];}})));return target[prop];}});
  const failingService=new PortalRequestService(new PrismaPortalRequestRepository(failingDb));
  await assert.rejects(failingService.submit({entraObjectId:actor.entraObjectId},{...concurrentBody,idempotencyKey:failedKey}));
  assert.equal(await db.accessRequest.count({where:{idempotencyKey:failedKey}}),0);
  assert.equal(await db.auditLog.count({where:{correlationId:failedKey}}),0);
  checks.push('Real SQL transaction rolls back request/item on injected audit failure');
  const permissions=await db.$queryRawUnsafe("SELECT HAS_PERMS_BY_NAME('dbo.Users','OBJECT','INSERT') AS seedWrite, HAS_PERMS_BY_NAME('dbo.AccessRequests','OBJECT','UPDATE') AS requestUpdate, HAS_PERMS_BY_NAME('dbo.AuditLogs','OBJECT','DELETE') AS auditDelete, HAS_PERMS_BY_NAME('dbo.Approvals','OBJECT','INSERT') AS approvalWrite, HAS_PERMS_BY_NAME('dbo.AutomationJobs','OBJECT','INSERT') AS automationWrite, HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','ALTER') AS ddl");
  assert(Object.values(permissions[0]).every(v=>v===0));
  checks.push('Runtime cannot seed, update request, delete audit, approve, automate or alter DB');
  console.log(JSON.stringify({result:'PASS',boundary:'SQL-backed HTTP handlers with synthetic JWT verification; no live browser sign-in',checks},null,2));
}
try {await main();} catch(e) {console.log(JSON.stringify({result:'FAIL',completedChecks:checks,code:e.code||'ACCEPTANCE_FAILED'}));process.exitCode=1;} finally {await db?.$disconnect();}
