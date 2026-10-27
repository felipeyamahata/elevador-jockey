const STATES = {
  IDLE_DOOR1_OPEN: 'IDLE_DOOR1_OPEN',
  IDLE_DOOR1_CLOSED: 'IDLE_DOOR1_CLOSED',
  DESCENDING: 'DESCENDING',
  ARRIVED_MINUS7: 'ARRIVED_MINUS7',
  DOOR2_OPEN: 'DOOR2_OPEN',
  DOOR2_CLOSED: 'DOOR2_CLOSED'
};

class ElevatorSimulator {
  constructor() {
    this.state = STATES.IDLE_DOOR1_OPEN;
    this.currentFloor = 0;
    this.isAudioEnabled = true;
    this.isAutoDemoRunning = false;
    this.demoTimeouts = [];
    this.descentInterval = null;
    this.audioCtx = null;
    this.motorNode = null;
    this.motorGain = null;
    this.activeTab = 'entrada';
    this.initAudio();
    this.bindEvents();
    this.updateUI();
  }

  el(id) { return document.getElementById(id); }
  text(id, value) { this.el(id).textContent = value; }

  initAudio() {
    // Inicialização atrasada do AudioContext no primeiro gesto do usuário
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  // SINTETIZADOR DE SONS VIA WEB AUDIO API (SEM DEPENDÊNCIAS EXTERNAS)
  playSound(type) {
    if (!this.isAudioEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;

      if (type === 'click') {
        // Clique mecânico de botão de elevador
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }

      else if (type === 'floorTick') {
        // Bip sutil a cada andar ultrapassado
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }

      else if (type === 'dingdong') {
        // Clássico sino duplo de elevador ao chegar ao destino
        const chime1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        chime1.type = 'sine';
        chime1.frequency.setValueAtTime(659.25, now); // Nota E5
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        chime1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        chime1.start(now);
        chime1.stop(now + 0.85);

        const chime2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        chime2.type = 'sine';
        chime2.frequency.setValueAtTime(523.25, now + 0.35); // Nota C5
        gain2.gain.setValueAtTime(0.35, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        chime2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        chime2.start(now + 0.35);
        chime2.stop(now + 1.45);
      }

      else if (type === 'doorAlert') {
        // Tom de atenção de porta aberta
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  startMotorHum() {
    if (!this.isAudioEnabled || !this.audioCtx) return;
    try {
      this.stopMotorHum();
      const now = this.audioCtx.currentTime;
      this.motorNode = this.audioCtx.createOscillator();
      this.motorGain = this.audioCtx.createGain();
      this.motorNode.type = 'triangle';
      this.motorNode.frequency.setValueAtTime(52, now); // Ronco mecânico 52Hz
      
      this.motorGain.gain.setValueAtTime(0.01, now);
      this.motorGain.gain.linearRampToValueAtTime(0.18, now + 0.5);

      this.motorNode.connect(this.motorGain);
      this.motorGain.connect(this.audioCtx.destination);
      this.motorNode.start(now);
    } catch (e) {
      console.warn('Motor audio error:', e);
    }
  }

  stopMotorHum() {
    const node = this.motorNode;
    const gain = this.motorGain;
    this.motorNode = null;
    this.motorGain = null;
    if (!node) return;
    try {
      const now = this.audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      node.stop(now + 0.16);
      node.onended = () => { node.disconnect(); gain.disconnect(); };
    } catch (error) { node.disconnect(); }
  }

  bindEvents() {
    this.el('btnAbout').addEventListener('click', () => this.el('aboutDialog').showModal());
    const manual = (id, action) => this.el(id).addEventListener('click', () => {
      this.cancelAutoDemo();
      action.call(this);
    });
    manual('btnToggleDoor1', this.toggleDoor1);
    manual('btnFloorMinus7', this.pressFloorMinus7);
    manual('btnStaffAction', this.handleStaffAction);
    manual('btnStaffReset', this.resetToFloorZero);
    manual('btnMasterReset', this.resetToFloorZero);
    manual('mapDoor1', this.toggleDoor1);
    manual('mapDoor2', this.handleStaffAction);
    this.el('btnAutoDemo').addEventListener('click', () => {
      if (this.isAutoDemoRunning) this.cancelAutoDemo();
      else this.startAutoDemo();
    });
    this.el('btnAudioToggle').addEventListener('click', () => {
      this.isAudioEnabled = !this.isAudioEnabled;
      this.el('btnAudioToggle').setAttribute('aria-pressed', this.isAudioEnabled);
      this.el('soundIcon').setAttribute('href', this.isAudioEnabled ? '#i-sound' : '#i-muted');
      this.el('btnAudioToggle').setAttribute('aria-label', this.isAudioEnabled ? 'Desativar som' : 'Ativar som');
      this.el('btnAudioToggle').title = this.isAudioEnabled ? 'Desativar som' : 'Ativar som';
      if (!this.isAudioEnabled) this.stopMotorHum();
      else if (this.state === STATES.DESCENDING) this.startMotorHum();
    });
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectTab(btn.dataset.tab);
        // Browsing during the presentation transfers navigation to the viewer.
        this.followDemo = false;
        this.updateDemoLabel();
      });
    });
    // Keep the same top edge when changing environments on a narrow screen.
    document.querySelectorAll('[data-environment-link]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        this.selectTab(link.dataset.environmentLink);
        this.followDemo = false;
        this.updateDemoLabel();
      });
    });
    this.selectTab('entrada');
  }

  selectTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.nav-tab').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('.environment').forEach(panel => {
      panel.classList.toggle('is-active', panel.id === tab);
    });
    this.updateAttention();
  }

  updateAttention() {
    const needsAction = this.state === STATES.ARRIVED_MINUS7 && this.activeTab !== 'operacao';
    this.el('navOperacao').classList.toggle('needs-attention', needsAction);
    this.el('navOperacao').setAttribute('aria-label', needsAction ? 'Operação: chegada ao -7, abra a porta' : 'Operação');
  }

  addStaffLog(message) {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    item.append(time, document.createTextNode(message));
    this.el('staffEventLog').prepend(item);
    while (this.el('staffEventLog').children.length > 20) this.el('staffEventLog').lastElementChild.remove();
  }

  toggleDoor1() {
    if (![STATES.IDLE_DOOR1_OPEN, STATES.IDLE_DOOR1_CLOSED].includes(this.state)) return;
    this.state = this.state === STATES.IDLE_DOOR1_OPEN ? STATES.IDLE_DOOR1_CLOSED : STATES.IDLE_DOOR1_OPEN;
    this.playSound('click');
    this.addStaffLog(this.state === STATES.IDLE_DOOR1_CLOSED ? 'Porta de entrada fechada. Sensor acionado.' : 'Porta de entrada aberta.');
    this.updateUI();
  }

  pressFloorMinus7() {
    if (this.state !== STATES.IDLE_DOOR1_CLOSED) return;
    this.state = STATES.DESCENDING;
    this.playSound('click');
    this.startMotorHum();
    this.addStaffLog('Descida iniciada. Destino: -7.');
    this.updateUI();
    this.descentInterval = setInterval(() => {
      this.currentFloor -= 1;
      this.playSound('floorTick');
      this.updateFloorVisuals();
      if (this.currentFloor === -7) {
        clearInterval(this.descentInterval);
        this.descentInterval = null;
        this.stopMotorHum();
        this.state = STATES.ARRIVED_MINUS7;
        this.playSound('dingdong');
        this.addStaffLog('Chegada ao -7. Abertura da saída liberada.');
        if (this.isAutoDemoRunning && this.followDemo) this.selectTab('operacao');
        this.updateUI();
      }
    }, 1100);
  }

  handleStaffAction() {
    if (this.state === STATES.ARRIVED_MINUS7) {
      this.state = STATES.DOOR2_OPEN;
      this.addStaffLog('Porta de saída aberta. Desembarque.');
    } else if (this.state === STATES.DOOR2_OPEN) {
      this.state = STATES.DOOR2_CLOSED;
      this.addStaffLog('Porta de saída fechada. Ciclo concluído.');
    } else return;
    this.playSound('click');
    this.updateUI();
  }

  resetToFloorZero() {
    clearInterval(this.descentInterval);
    this.descentInterval = null;
    this.stopMotorHum();
    this.currentFloor = 0;
    this.state = STATES.IDLE_DOOR1_OPEN;
    this.addStaffLog('Experiência reiniciada. Entrada disponível.');
    this.updateUI();
  }

  renderDigit(id) {
    const segments = {0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc'};
    const display = this.el(id);
    const lit = segments[Math.abs(this.currentFloor)];
    display.classList.toggle('negative', this.currentFloor < 0);
    display.querySelectorAll('[data-segment]').forEach(segment => {
      segment.classList.toggle('lit', lit.includes(segment.dataset.segment));
    });
  }

  updateFloorVisuals() {
    this.renderDigit('outsideDigits');
    this.renderDigit('cabinDigits');
    this.text('outsideFloorText', `Andar ${this.currentFloor}`);
    document.querySelectorAll('[data-floor]').forEach(stop => {
      stop.classList.toggle('passed', Number(stop.dataset.floor) >= this.currentFloor);
      stop.classList.toggle('current', Number(stop.dataset.floor) === this.currentFloor);
    });
    this.text('floorNumber', this.currentFloor);
    this.text('mapFloor', this.currentFloor);
    this.text('staffFloor', this.currentFloor);
    this.el('journeyProgress').style.setProperty('--travel', `${Math.abs(this.currentFloor) / 7 * 100}%`);
  }

  updateUI() {
    const s = this.state;
    const open = s === STATES.IDLE_DOOR1_OPEN;
    const ready = s === STATES.IDLE_DOOR1_CLOSED;
    const descending = s === STATES.DESCENDING;
    const arrived = s === STATES.ARRIVED_MINUS7;
    const exiting = s === STATES.DOOR2_OPEN;
    const complete = s === STATES.DOOR2_CLOSED;
    const labels = {
      [STATES.IDLE_DOOR1_OPEN]: ['Entrada disponível', 'Feche a porta para começar', 'Aguardando visitante', 'A saída será liberada ao chegar ao -7.'],
      [STATES.IDLE_DOOR1_CLOSED]: ['Visitante a bordo', 'Escolha seu destino', 'Pronto para a descida', 'O visitante já pode selecionar o -7.'],
      [STATES.DESCENDING]: ['Experiência em andamento', 'Descendo', 'Descida em andamento', 'Aguarde a chegada para abrir a saída.'],
      [STATES.ARRIVED_MINUS7]: ['Chegada ao subsolo', 'Você chegou', 'Abra a porta de saída', 'Chegada ao -7 confirmada.'],
      [STATES.DOOR2_OPEN]: ['Desembarque', 'Bem-vindo ao subsolo', 'Visitante saindo', 'Feche a porta após o desembarque.'],
      [STATES.DOOR2_CLOSED]: ['Ciclo concluído', 'Até a próxima viagem', 'Pronto para reiniciar', 'Libere a entrada para o próximo visitante.']
    }[s];
    document.body.dataset.state = s;
    this.text('globalStatus', labels[0]);
    this.text('cabinMessage', labels[1]);
    this.text('operatorTitle', labels[2]);
    this.text('operatorDescription', labels[3]);
    this.text('outsideHeadline', open ? 'Livre' : 'Aguarde');
    this.text('outsideSub', open ? 'Sua experiência começa aqui.' : 'Uma experiência está em curso.');
    this.text('entranceStatus', open ? 'Disponível' : 'Em uso');
    this.text('door1Status', open ? 'Aberta' : 'Fechada');
    this.text('door2Status', exiting ? 'Aberta' : 'Fechada');
    this.text('btnDoor1Text', open ? 'Fechar porta de entrada' : ready ? 'Reabrir porta de entrada' : 'Entrada indisponível');
    this.el('btnToggleDoor1').disabled = !open && !ready;
    this.el('mapDoor1').disabled = !open && !ready;
    this.el('mapDoor1').setAttribute('aria-label', open ? 'Fechar porta de entrada' : 'Abrir porta de entrada');
    this.el('mapDoor2').disabled = !arrived && !exiting;
    this.el('mapDoor2').setAttribute('aria-label', exiting ? 'Fechar porta de saída' : 'Abrir porta de saída');
    this.text('sensorState', open ? 'Porta aberta · contato aberto' : 'Porta fechada · contato fechado');
    this.el('btnFloorMinus7').disabled = !ready;
    this.el('btnFloorMinus7').classList.toggle('selected', descending || arrived);
    this.text('cabinStatus', descending ? 'Em movimento' : arrived || exiting || complete ? 'Subsolo' : 'Térreo');
    this.el('directionArrow').classList.toggle('is-moving', descending);
    this.el('directionArrow').classList.toggle('visible', descending);
    this.text('arrivalNote', arrived ? 'Aguarde a abertura da porta de saída.' : '');
    this.el('btnStaffAction').hidden = complete;
    this.el('btnStaffAction').disabled = !arrived && !exiting;
    this.text('btnStaffAction', arrived ? 'Abrir porta de saída' : exiting ? 'Fechar porta de saída' : 'Aguardando chegada');
    this.el('btnStaffReset').hidden = !complete;
    this.el('operatorSignal').setAttribute('href', arrived ? '#i-check' : exiting ? '#i-exit' : complete ? '#i-reset' : descending ? '#i-down' : '#i-door');
    this.text('mapStatus', open ? 'Aguardando entrada' : ready ? 'Visitante na cabine' : descending ? 'Descida simulada' : arrived ? 'Saída liberada' : exiting ? 'Desembarque' : 'Cabine vazia');
    this.el('mapDoor1').classList.toggle('open', open);
    this.el('mapDoor2').classList.toggle('open', exiting);
    this.el('mapVisitor').dataset.position = open ? 'entry' : exiting || complete ? 'exit' : 'cabin';
    const step = open || ready ? 0 : descending ? 1 : 2;
    document.querySelectorAll('.journey-step').forEach((el, index) => {
      el.classList.toggle('current', index === step);
      el.classList.toggle('done', index < step);
      if (index === step) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    this.updateFloorVisuals();
    this.updateAttention();
  }

  schedule(action, delay) {
    this.demoTimeouts.push(setTimeout(() => {
      if (this.isAutoDemoRunning) action();
    }, delay));
  }

  updateDemoLabel() {
    this.el('btnAutoDemo').title = this.isAutoDemoRunning ? 'Parar apresentação' : 'Apresentar experiência';
    this.el('demoIcon').setAttribute('href', this.isAutoDemoRunning ? '#i-stop' : '#i-play');
    this.el('btnAutoDemo').setAttribute('aria-pressed', this.isAutoDemoRunning);
    this.el('btnAutoDemo').setAttribute('aria-label', this.isAutoDemoRunning ? 'Parar apresentação' : 'Apresentar experiência');
    this.text('demoStatus', this.isAutoDemoRunning ? (this.followDemo ? 'Apresentação automática · acompanhando ambientes' : 'Apresentação automática · navegação livre') : '');
    this.el('demoStatus').hidden = !this.isAutoDemoRunning;
  }

  startAutoDemo() {
    this.cancelAutoDemo();
    this.resetToFloorZero();
    this.isAutoDemoRunning = true;
    this.followDemo = true;
    this.selectTab('entrada');
    this.updateDemoLabel();
    this.schedule(() => this.toggleDoor1(), 1600);
    this.schedule(() => {
      if (this.followDemo) this.selectTab('cabine');
      this.pressFloorMinus7();
    }, 3200);
    this.schedule(() => this.handleStaffAction(), 12900);
    this.schedule(() => this.handleStaffAction(), 15300);
    this.schedule(() => {
      this.resetToFloorZero();
      if (this.followDemo) this.selectTab('entrada');
      this.cancelAutoDemo();
    }, 17500);
  }

  cancelAutoDemo() {
    this.isAutoDemoRunning = false;
    this.demoTimeouts.forEach(clearTimeout);
    this.demoTimeouts = [];
    // Stopping an automatic presentation also stops its running descent.
    if (this.descentInterval) this.resetToFloorZero();
    this.updateDemoLabel();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.elevatorSimulator = new ElevatorSimulator();
});
