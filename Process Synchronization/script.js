function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

function random(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
}

function addLog(id,message,type="info"){

    const div=document.createElement("div");

    div.className=`log-entry log-${type}`;

    div.innerText=message;

    document.getElementById(id).appendChild(div);

    const container=document.getElementById(id);

    container.scrollTop=container.scrollHeight;
}






/* TAB SWITCHING */

document.querySelectorAll(".tab").forEach(tab=>{

    tab.addEventListener("click",()=>{

        document.querySelectorAll(".tab").forEach(t=>{
            t.classList.remove("active");
        });

        document.querySelectorAll(".tab-content").forEach(c=>{
            c.classList.remove("active");
        });

        tab.classList.add("active");

        document.getElementById(
            tab.dataset.tab
        ).classList.add("active");

    });

});






/* PRODUCER CONSUMER */

let pcRunning=false;

function initPC(){

    const size=parseInt(
        document.getElementById("pc-buffer-size").value
    );

    const buffer=document.getElementById("pc-buffer");

    buffer.innerHTML="";

    for(let i=0;i<size;i++){

        const item=document.createElement("div");

        item.className="buffer-item";

        item.id=`buffer-${i}`;

        buffer.appendChild(item);

    }

}

async function producer(id){

    while(pcRunning){

        await sleep(random(1000,3000));

        const items=document.querySelectorAll(".buffer-item");

        for(let box of items){

            if(box.innerHTML===""){

                box.innerHTML=random(1,99);

                box.classList.add("full");

                addLog(
                    "pc-log",
                    `Producer ${id} produced item`,
                    "success"
                );

                break;
            }

        }

    }

}

async function consumer(id){

    while(pcRunning){

        await sleep(random(1000,3000));

        const items=document.querySelectorAll(".buffer-item");

        for(let i=items.length-1;i>=0;i--){

            if(items[i].innerHTML!==""){

                items[i].innerHTML="";

                items[i].classList.remove("full");

                addLog(
                    "pc-log",
                    `Consumer ${id} consumed item`,
                    "warning"
                );

                break;
            }

        }

    }

}

function startProducerConsumer(){

    pcRunning=true;

    initPC();

    const p=parseInt(
        document.getElementById("pc-producers").value
    );

    const c=parseInt(
        document.getElementById("pc-consumers").value
    );

    const pcP=document.getElementById(
        "pc-producers-container"
    );

    const pcC=document.getElementById(
        "pc-consumers-container"
    );

    pcP.innerHTML="";
    pcC.innerHTML="";

    for(let i=0;i<p;i++){

        const div=document.createElement("div");

        div.className="agent producer";

        div.innerText=`P${i}`;

        pcP.appendChild(div);

        producer(i);

    }

    for(let i=0;i<c;i++){

        const div=document.createElement("div");

        div.className="agent consumer";

        div.innerText=`C${i}`;

        pcC.appendChild(div);

        consumer(i);

    }

}

function stopProducerConsumer(){
    pcRunning=false;
}

function resetProducerConsumer(){

    stopProducerConsumer();

    document.getElementById("pc-log").innerHTML="";

    initPC();

}

document.getElementById("pc-start")
.addEventListener("click",startProducerConsumer);

document.getElementById("pc-stop")
.addEventListener("click",stopProducerConsumer);

document.getElementById("pc-reset")
.addEventListener("click",resetProducerConsumer);






/* READERS WRITERS */

let rwRunning=false;

let activeReaders=[];

let writerActive=false;

let writerWaiting=false;

function initRW(){

    const readers=parseInt(
        document.getElementById("rw-readers").value
    );

    const writers=parseInt(
        document.getElementById("rw-writers").value
    );

    const rc=document.getElementById(
        "rw-readers-container"
    );

    const wc=document.getElementById(
        "rw-writers-container"
    );

    rc.innerHTML="";
    wc.innerHTML="";

    for(let i=0;i<readers;i++){

        const div=document.createElement("div");

        div.className="agent reader";

        div.innerText=`R${i}`;

        rc.appendChild(div);

    }

    for(let i=0;i<writers;i++){

        const div=document.createElement("div");

        div.className="agent writer";

        div.innerText=`W${i}`;

        wc.appendChild(div);

    }

    document.getElementById("rw-status")
    .innerHTML="Idle";

}

function updateReadersDisplay(){

    if(writerActive) return;

    const status=document.getElementById("rw-status");

    if(activeReaders.length===0){

        status.innerHTML="Idle";

    }else{

        status.innerHTML=
            activeReaders
            .map(r=>`Reader ${r}`)
            .join("<br>")+
            "<br>Reading";

    }

}

async function reader(id){

    while(rwRunning){

        await sleep(random(1000,2500));

        if(!rwRunning) break;

        while(
            writerActive ||
            writerWaiting
        ){

            await sleep(500);

            if(!rwRunning) return;

        }

        if(!activeReaders.includes(id)){

            activeReaders.push(id);

            updateReadersDisplay();

            addLog(
                "rw-log",
                `Reader ${id} started reading`,
                "success"
            );

        }

        await sleep(random(2000,3500));

        activeReaders=activeReaders.filter(
            r=>r!==id
        );

        updateReadersDisplay();

        addLog(
            "rw-log",
            `Reader ${id} finished reading`,
            "info"
        );

        await sleep(random(500,1200));

    }

}

async function writer(id){

    while(rwRunning){

        await sleep(random(2500,4500));

        if(!rwRunning) break;

        writerWaiting=true;

        addLog(
            "rw-log",
            `Writer ${id} waiting to write`,
            "warning"
        );

        while(
            writerActive ||
            activeReaders.length>0
        ){

            await sleep(500);

            if(!rwRunning) return;

        }

        writerWaiting=false;

        writerActive=true;

        document.getElementById("rw-status")
        .innerHTML=
        `Writer ${id}<br>Writing`;

        addLog(
            "rw-log",
            `Writer ${id} started writing`,
            "warning"
        );

        await sleep(random(2000,3500));

        addLog(
            "rw-log",
            `Writer ${id} finished writing`,
            "info"
        );

        writerActive=false;

        updateReadersDisplay();

        await sleep(random(1000,2000));

    }

}

function startReadersWriters(){

    rwRunning=true;

    writerActive=false;

    writerWaiting=false;

    activeReaders=[];

    initRW();

    const readers=parseInt(
        document.getElementById("rw-readers").value
    );

    const writers=parseInt(
        document.getElementById("rw-writers").value
    );

    for(let i=0;i<readers;i++){

        reader(i);

    }

    for(let i=0;i<writers;i++){

        writer(i);

    }

}

function stopReadersWriters(){

    rwRunning=false;

}

function resetReadersWriters(){

    stopReadersWriters();

    activeReaders=[];

    writerActive=false;

    writerWaiting=false;

    document.getElementById("rw-log")
    .innerHTML="";

    document.getElementById("rw-status")
    .innerHTML="Idle";

}

document.getElementById("rw-start")
.addEventListener("click",startReadersWriters);

document.getElementById("rw-stop")
.addEventListener("click",stopReadersWriters);

document.getElementById("rw-reset")
.addEventListener("click",resetReadersWriters);






/* DINING PHILOSOPHERS */

let dpRunning=false;

let forks=[];

function initDP(){

    const n=parseInt(
        document.getElementById("dp-philosophers").value
    );

    forks=new Array(n).fill(false);

    const table=document.getElementById("dp-table");

    table.innerHTML=
    `<div class="table-center">TABLE</div>`;

    const status=document.getElementById(
        "dp-status-container"
    );

    status.innerHTML="";

    for(let i=0;i<n;i++){

        const angle=(2*Math.PI/n)*i;

        const x=50+40*Math.cos(angle);

        const y=50+40*Math.sin(angle);

        const philosopher=document.createElement("div");

        philosopher.className="philosopher-seat";

        philosopher.id=`philosopher-${i}`;

        philosopher.innerText=`P${i}`;

        philosopher.style.left=`${x}%`;

        philosopher.style.top=`${y}%`;

        table.appendChild(philosopher);

        const state=document.createElement("div");

        state.className="philosopher-status";

        state.id=`status-${i}`;

        state.innerText=`P${i} : Thinking`;

        status.appendChild(state);

    }

}

async function philosopher(id,n){

    const left=id;

    const right=(id+1)%n;

    while(dpRunning){

        document.getElementById(
            `status-${id}`
        ).innerText=`P${id} : Thinking`;

        addLog(
            "dp-log",
            `Philosopher ${id} is thinking`,
            "info"
        );

        await sleep(random(2000,4000));

        document.getElementById(
            `status-${id}`
        ).innerText=`P${id} : Waiting`;

        addLog(
            "dp-log",
            `Philosopher ${id} is waiting for chopsticks`,
            "warning"
        );

        let firstFork;
        let secondFork;

        /* ODD -> LEFT FIRST
           EVEN -> RIGHT FIRST */

        if(id%2===0){

            firstFork=right;
            secondFork=left;

        }else{

            firstFork=left;
            secondFork=right;

        }

        while(
            forks[firstFork] ||
            forks[secondFork]
        ){

            await sleep(500);

            if(!dpRunning) return;

        }

        forks[firstFork]=true;
        forks[secondFork]=true;

        document.getElementById(
            `status-${id}`
        ).innerText=`P${id} : Eating`;

        addLog(
            "dp-log",
            `Philosopher ${id} picked chopsticks ${firstFork} and ${secondFork}`,
            "success"
        );

        addLog(
            "dp-log",
            `Philosopher ${id} is eating`,
            "success"
        );

        await sleep(random(2500,4500));

        forks[firstFork]=false;
        forks[secondFork]=false;

        addLog(
            "dp-log",
            `Philosopher ${id} released chopsticks`,
            "info"
        );

    }

}

function startDiningPhilosophers(){

    dpRunning=true;

    initDP();

    const n=parseInt(
        document.getElementById("dp-philosophers").value
    );

    for(let i=0;i<n;i++){

        philosopher(i,n);

    }

}

function stopDiningPhilosophers(){

    dpRunning=false;

}

function resetDiningPhilosophers(){

    stopDiningPhilosophers();

    document.getElementById("dp-log")
    .innerHTML="";

    initDP();

}

document.getElementById("dp-start")
.addEventListener("click",startDiningPhilosophers);

document.getElementById("dp-stop")
.addEventListener("click",stopDiningPhilosophers);

document.getElementById("dp-reset")
.addEventListener("click",resetDiningPhilosophers);






/* REQUIRED FUNCTIONS */

function runSimulation(){

    const active=document.querySelector(
        ".tab.active"
    ).dataset.tab;

    if(active==="producer-consumer"){

        startProducerConsumer();

    }

    if(active==="readers-writers"){

        startReadersWriters();

    }

    if(active==="dining-philosophers"){

        startDiningPhilosophers();

    }

}

function resetAll(){

    resetProducerConsumer();

    resetReadersWriters();

    resetDiningPhilosophers();

}

window.onload=()=>{

    initPC();

    initRW();

    initDP();

};