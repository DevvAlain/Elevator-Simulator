import { Elevator } from '../src/models/Elevator';
import { Building } from '../src/models/Building';
import { ElevatorController } from '../src/services/ElevatorController';
import { LookAlgorithmStrategy, NearestElevatorStrategy } from '../src/services/dispatchStrategies';

let fails=0, passes=0;
function ok(c:boolean, msg:string){
  if(c){ passes++; console.log('  PASS',msg); }
  else{ fails++; console.log('  FAIL',msg); }
}
function eq(a:any,b:any,msg:string){ ok(JSON.stringify(a)===JSON.stringify(b), msg + ' got='+JSON.stringify(a)+' exp='+JSON.stringify(b)); }

// 1. LOOK
{
  const e=new Elevator(1,1);
  e.requestFloor(10);
  eq(e.getState().queue,[10],'q [10]');
  e.requestHall(5,'UP');
  eq(e.getState().queue,[5,10],'UP hall [5,10]');
}
{
  const e=new Elevator(1,1);
  e.requestFloor(10);
  e.requestHall(5,'DOWN');
  eq(e.getState().queue,[10,5],'DOWN hall deferred [10,5]');
}

// 2. step skips opposite hall
{
  const e=new Elevator(1,1);
  e.requestFloor(10);
  e.requestHall(5,'DOWN');
  ok(e.getState().direction==='UP','dir UP');
  let opened=false;
  (e as any).openDoor=()=>{ opened=true; };
  e.step(); ok(e.getState().currentFloor===2,'step to 2');
  e.step(); ok(e.getState().currentFloor===3,'step to 3');
  e.step(); ok(e.getState().currentFloor===4,'step to 4');
  opened=false; e.step();
  ok(e.getState().currentFloor===5,'at 5');
  ok(!opened,'should NOT open at 5 (DOWN while UP)');
  ok(e.getState().queue.includes(10) && e.getState().queue.includes(5),'queue still has 10 and 5');
}

// 3. CarCall deferred correctly
{
  const e=new Elevator(1,5);
  e.requestFloor(10);
  e.requestFloor(2);
  eq(e.getState().queue,[10,2],'car DOWN deferred [10,2]');
}
{
  const e2=new Elevator(1,5);
  e2.requestHall(8,'DOWN');
  e2.requestFloor(10);
  eq(e2.getState().queue,[10,8],'DOWN hall at 8 deferred while UP');
}

// 4. IDLE picks nearest
{
  const e=new Elevator(1,5);
  e.requestHall(3,'UP');
  eq(e.getState().queue,[3],'idle picks 3');
  ok(e.getState().direction==='DOWN','dir DOWN to 3');
}

// 5. Same floor opens door
{
  const e=new Elevator(1,5);
  e.requestFloor(5);
  ok(e.getState().state==='DOOR_OPENING' || e.getState().state==='DOOR_OPEN','same floor opens door');
}

// 6. Dedup
{
  const e=new Elevator(1,1);
  e.requestFloor(5); e.requestFloor(5);
  ok(e.getState().queue.filter(x=>x===5).length===1,'dedup');
}

// 7. Building validate
{
  const b=new Building(10,[]);
  ok(b.validateHall(1,'DOWN')!==null,'F1 DOWN fail');
  ok(b.validateHall(10,'UP')!==null,'F10 UP fail');
  ok(b.validateHall(0,'UP')!==null,'F0 fail');
  ok(b.validateHall(11,'UP')!==null,'F11 fail');
  ok(b.validateHall(5,'UP')===null,'F5 UP ok');
  ok(b.validateHall(5,'DOWN')===null,'F5 DOWN ok');
}

// 8. Controller
{
  const c=new ElevatorController(3);
  ok('error' in c.dispatchHall(1,'DOWN'),'F1 DOWN error');
  ok('assigned' in c.dispatchHall(5,'UP'),'F5 UP assigned');
  ok(c.carCall(99,5)!==null,'bad elevator 99');
  ok(c.carCall(1,11)!==null,'bad floor 11');
  ok(c.carCall(1,5)===null,'good car call');
}

// 9. Door
{
  const c=new ElevatorController(1);
  c.elevators[0].requestFloor(1);
  c.holdDoor(1); ok(c.elevators[0].getState().doorHeld===true,'hold true');
  c.closeDoor(1); ok(c.elevators[0].getState().doorHeld===false,'hold false');
}

// 10. Dispatch
{
  const a=new Elevator(1,1); const b=new Elevator(2,10);
  ok(new NearestElevatorStrategy().select(2,'UP',[a,b]).id===1,'nearest 2 is 1');
  const e1=new Elevator(1,3); e1.requestFloor(10);
  const e2=new Elevator(2,9);
  ok([1,2].includes(new LookAlgorithmStrategy().select(5,'UP',[e1,e2]).id),'look picks one');
}

// 11. DOWN direction LOOK
{
  const e=new Elevator(1,10);
  e.requestFloor(1); // going DOWN
  e.requestHall(5,'DOWN');
  eq(e.getState().queue,[5,1],'DOWN hall [5,1] while going DOWN');
  const e3=new Elevator(1,10);
  e3.requestFloor(1);
  e3.requestHall(5,'UP');
  eq(e3.getState().queue,[1,5],'UP hall deferred while going DOWN [1,5]');
}

console.log('\nTotal passes',passes,'fails',fails);
if(fails>0) process.exit(1);
else console.log('ALL CHECKS PASSED');
