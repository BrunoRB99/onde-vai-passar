// =================== FIREBASE ===================
const firebaseConfig = {
  apiKey: "AIzaSyDauTkHFVnMXWvGh8czNwIJ3O5Q2j1e-Q0",
  authDomain: "onde-vai-passar-ceda8.firebaseapp.com",
  databaseURL: "https://onde-vai-passar-ceda8-default-rtdb.firebaseio.com",
  projectId: "onde-vai-passar-ceda8",
  storageBucket: "onde-vai-passar-ceda8.firebasestorage.app",
  messagingSenderId: "885400920326",
  appId: "1:885400920326:web:2866a629824fa256c8fe87"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =================== STORAGE (Firebase) ===================

function getJogos(callback) {
  db.ref('jogos').once('value', snap => {
    const val = snap.val();
    callback(val ? Object.values(val) : []);
  });
}
function saveJogo(jogo) { db.ref('jogos/' + jogo.id).set(jogo); }
function deleteJogo(id) { db.ref('jogos/' + id).remove(); }

function getEsportes(callback) {
  db.ref('esportes').once('value', snap => { callback(snap.val() || []); });
}
function saveEsportes(lista) { db.ref('esportes').set(lista); }

function getCampeonatos(callback) {
  db.ref('campeonatos').once('value', snap => { callback(snap.val() || {}); });
}
function saveCampeonatos(obj) { db.ref('campeonatos').set(obj); }

function getTimes(callback) {
  db.ref('times').once('value', snap => { callback(snap.val() || {}); });
}
function saveTimes(obj) { db.ref('times').set(obj); }

function salvarEscudoTime(nome, url) {
  if (!nome || !url) return;
  getTimes(times => {
    times[nome.trim()] = url.trim();
    saveTimes(times);
  });
}

function buscarEscudo(nome, callback) {
  if (!nome) { callback(''); return; }
  getTimes(times => { callback(times[nome.trim()] || ''); });
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatarRodada(valor) {
  if (!valor) return '';
  // Se for só número, adiciona "ª Rodada"
  if (/^\d+$/.test(valor)) return valor + 'ª Rodada';
  return valor;
}

function iconeEsporte(esporte) {
  if (!esporte) return '';
  const nome = esporte.toLowerCase();
  if (nome.includes('futebol americano')) return '🏈';
  if (nome.includes('futebol')) return '⚽';
  if (nome.includes('vôlei') || nome.includes('volei')) return '🏐';
  if (nome.includes('basquete') || nome.includes('basketball')) return '🏀';
  if (nome.includes('tênis') || nome.includes('tenis')) return '🎾';
  if (nome.includes('natação') || nome.includes('natacao')) return '🏊';
  if (nome.includes('nfl')) return '🏈';
  if (nome.includes('nba')) return '🏀';
  return '';
}

// =================== AUTO STATUS ===================
function verificarStatusAutomatico() {
  const agora = new Date();
  const hoje = hojeStr();
  const horaAtual = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');

  getJogos(jogos => {
    let alterou = false;
    jogos.forEach(j => {
      if (j.data === hoje && j.status === 'agendado' && j.horario <= horaAtual) {
        j.status = 'aovivo';
        saveJogo(j);
        alterou = true;
      }
    });
    if (alterou) renderLista();
  });
}

// Verifica imediatamente ao carregar e depois a cada 60 segundos
verificarStatusAutomatico();
setInterval(() => {
  verificarStatusAutomatico();
  renderLista();
}, 5000);

// =================== STATUS ===================
const STATUS_LABELS = {
  agendado:  { label: '📅 Agendado',  cls: 'status-agendado' },
  aovivo:    { label: '🔴 Ao Vivo',   cls: 'status-aovivo'  },
  pausado:   { label: '⏸️ Pausado',   cls: 'status-pausado' },
  encerrado: { label: '✅ Encerrado', cls: 'status-encerrado'},
};

// =================== PÁGINA PÚBLICA ===================
let abaAtiva = 'todos';
let gruposAbertos = new Set();
let dataSelecionada = hojeStr();

function hojeStr() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function mudarData(delta) {
  const d = new Date(dataSelecionada + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  dataSelecionada = `${ano}-${mes}-${dia}`;
  gruposAbertos.clear();
  renderJogos();
}

function irParaHoje() {
  dataSelecionada = hojeStr();
  gruposAbertos.clear();
  renderJogos();
}

function renderJogos() {
  const container = document.getElementById('jogosContainer');
  if (!container) return;

    const dateEl = document.getElementById('headerDate');
  if (dateEl) {
    const d = new Date(dataSelecionada + 'T12:00:00');
    const hoje = hojeStr();
    const isHoje = dataSelecionada === hoje;
    dateEl.innerHTML = `<span class="${isHoje ? 'header-date-hoje' : ''}">${d.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })}</span>`;
  }
    const btnHoje = document.getElementById('btnHoje');
  if (btnHoje) {
    btnHoje.style.display = dataSelecionada !== hojeStr() ? 'inline-block' : 'none';
  }

  document.querySelectorAll('.aba').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
      btn.classList.add('ativa');
      abaAtiva = btn.dataset.esporte;
      gruposAbertos.clear();
      renderLista();
    });
  });

  renderLista();
}

function renderLista() {
  const container = document.getElementById('jogosContainer');
  if (!container) return;

  getJogos(jogos => {
    jogos = jogos.filter(j => j.data === dataSelecionada);

    if (abaAtiva !== 'todos') {
      jogos = jogos.filter(j => j.esporte === abaAtiva);
    }

    if (!jogos.length) {
      container.innerHTML = `<div class="card empty-state"><span>📺</span><p>Nenhum jogo cadastrado.</p></div>`;
      return;
    }

    const grupos = {};
    jogos.sort((a, b) => a.horario.localeCompare(b.horario));
    jogos.forEach(j => {
      const key = j.campeonato + '||' + (j.rodada || '');
      if (!grupos[key]) grupos[key] = { campeonato: j.campeonato, rodada: j.rodada, esporte: j.esporte, bandeira: j.bandeiraCampeonato || '', jogos: [] };
      grupos[key].jogos.push(j);
    });

    if (abaAtiva === 'todos') {
      Object.keys(grupos).forEach(k => gruposAbertos.add(k));
    }

    let html = '';
    for (const [camp, grupo] of Object.entries(grupos)) {
      const aberto = gruposAbertos.has(camp);
      const campEscaped = camp.replace(/'/g, "\\'");

      const jogosHtml = grupo.jogos.map(j => {
        const canais = j.canais.split(',').map(c => c.trim()).filter(Boolean);
        const st = STATUS_LABELS[j.status] || STATUS_LABELS.agendado;
        const canaisHtml = canais.map(c => `<span class="canal-tag destaque">${c}</span>`).join('');
        return `<div class="jogo-card ${j.status}">
          <div class="jogo-hora">
            <div class="hora">${j.horario}</div>
            <span class="status-dot ${st.cls}"></span>
          </div>
          <div class="jogo-info">
            <div class="jogo-times">
              ${j.logoMandante ? `<img class="escudo" src="${j.logoMandante}" alt="${j.mandante}" onerror="this.style.display='none'">` : ''}
              ${j.mandante} <span class="vs">x</span> ${j.visitante}
              ${j.logoVisitante ? `<img class="escudo" src="${j.logoVisitante}" alt="${j.visitante}" onerror="this.style.display='none'">` : ''}
            </div>
            <div class="jogo-canais-pub">${canaisHtml}</div>
          </div>
          <div class="jogo-status-col">
            <span class="status-badge ${st.cls}">${st.label}</span>
          </div>
        </div>`;
      }).join('');

      html += `<div class="grupo-campeonato card">
        <div class="grupo-header" onclick="toggleGrupo('${campEscaped}')">
          <div class="grupo-header-left">
            <span class="camp-nome">${grupo.bandeira || iconeEsporte(grupo.esporte)} ${grupo.campeonato}</span>
            ${grupo.rodada ? `<span class="camp-rodada">${grupo.rodada}</span>` : ''}
            <span class="camp-count">${grupo.jogos.length} jogo${grupo.jogos.length > 1 ? 's' : ''}</span>
          </div>
          <span class="grupo-chevron ${aberto ? 'aberto' : ''}">▼</span>
        </div>
        <div class="grupo-jogos ${aberto ? 'aberto' : ''}">
          ${jogosHtml}
        </div>
      </div>`;
    }

    container.innerHTML = html;
  });
}

function toggleGrupo(camp) {
  if (gruposAbertos.has(camp)) {
    gruposAbertos.delete(camp);
  } else {
    gruposAbertos.add(camp);
  }
  renderLista();
}

// =================== MODO LOTE ===================
function toggleModoLote() {
  const ativo = document.getElementById('modoLote').checked;
  const campos = [
    document.getElementById('esporteJogo'),
    document.getElementById('campeonato'),
    document.getElementById('rodada'),
    document.getElementById('dataJogo'),
  ];
  campos.forEach(c => {
    if (!c) return;
    c.disabled = ativo;
    c.closest('.form-group').style.opacity = ativo ? '0.5' : '1';
  });
}

// =================== ADMIN — INIT ===================

// =================== ADMIN — INIT ===================
function initAdmin() {
  renderListaEsportes();
  renderSelectsEsporte();
  renderAdmin();
  document.getElementById('dataJogo').value = hojeStr();
}

// =================== ESPORTES ===================
function adicionarEsporte() {
  const input = document.getElementById('inputNovoEsporte');
  const nome = input.value.trim();
  if (!nome) return;

  getEsportes(esportes => {
    if (esportes.includes(nome)) { alert('Este esporte já está cadastrado.'); return; }
    esportes.push(nome);
    saveEsportes(esportes);
    input.value = '';
    renderListaEsportes();
    renderSelectsEsporte();
  });
}

function excluirEsporte(nome) {
  if (!confirm(`Excluir o esporte "${nome}"?\nTodos os campeonatos vinculados a ele também serão removidos.`)) return;

  getEsportes(esportes => {
    saveEsportes(esportes.filter(e => e !== nome));
    getCampeonatos(campeonatos => {
      delete campeonatos[nome];
      saveCampeonatos(campeonatos);
      renderListaEsportes();
      renderSelectsEsporte();
      renderCampeonatosPorEsporte();
    });
  });
}

function renderListaEsportes() {
  const container = document.getElementById('listaEsportes');
  if (!container) return;

  getEsportes(esportes => {
    if (!esportes.length) {
      container.innerHTML = `<p class="empty-msg">Nenhum esporte cadastrado.</p>`;
      return;
    }
    container.innerHTML = esportes.map(e => `
      <div class="tag-item">
        ${e}
        <button onclick="excluirEsporte('${e.replace(/'/g, "\\'")}')">✕</button>
      </div>
    `).join('');
  });
}

function renderSelectsEsporte() {
  getEsportes(esportes => {
    const optionsHtml = esportes.map(e => `<option value="${e}">${e}</option>`).join('');
    const sel1 = document.getElementById('esporteCampeonato');
    const sel2 = document.getElementById('esporteJogo');
    if (sel1) sel1.innerHTML = `<option value="">— Selecione um esporte primeiro —</option>` + optionsHtml;
    if (sel2) sel2.innerHTML = `<option value="">— Selecione o esporte —</option>` + optionsHtml;
  });
}

// =================== CAMPEONATOS ===================
function adicionarCampeonato() {
  const esporte = document.getElementById('esporteCampeonato').value;
  if (!esporte) { alert('Selecione um esporte primeiro.'); return; }
  const nome = document.getElementById('inputNovoCampeonato').value.trim();
  if (!nome) return;
  const bandeira = document.getElementById('inputBandeiraCampeonato').value.trim();

  getCampeonatos(campeonatos => {
    if (!campeonatos[esporte]) campeonatos[esporte] = [];
    if (campeonatos[esporte].some(c => (c.nome || c) === nome)) {
      alert('Este campeonato já está cadastrado para este esporte.'); return;
    }
    campeonatos[esporte].push({ nome, bandeira });
    saveCampeonatos(campeonatos);
    document.getElementById('inputNovoCampeonato').value = '';
    document.getElementById('inputBandeiraCampeonato').value = '';
    renderCampeonatosPorEsporte();
  });
}

function excluirCampeonato(esporte, idx) {
  if (!confirm('Excluir este campeonato?')) return;
  getCampeonatos(campeonatos => {
    campeonatos[esporte].splice(idx, 1);
    saveCampeonatos(campeonatos);
    renderCampeonatosPorEsporte();
  });
}

function renderCampeonatosPorEsporte() {
  const esporte = document.getElementById('esporteCampeonato')?.value;
  const bloco = document.getElementById('blocoCampeonato');
  const container = document.getElementById('listaCampeonatos');
  if (!bloco || !container) return;
  if (!esporte) { bloco.style.display = 'none'; return; }
  bloco.style.display = 'block';

  getCampeonatos(campeonatos => {
    const lista = campeonatos[esporte] || [];
    if (!lista.length) {
      container.innerHTML = `<p class="empty-msg">Nenhum campeonato cadastrado para este esporte.</p>`;
      return;
    }
    container.innerHTML = lista.map((c, i) => {
      const nome = c.nome || c;
      const bandeira = c.bandeira || '';
      return `<div class="tag-item">
        ${bandeira} ${nome}
        <button onclick="excluirCampeonato('${esporte.replace(/'/g, "\\'")}', ${i})">✕</button>
      </div>`;
    }).join('');
  });
}

function carregarCampeonatosNoForm(callback) {
  const esporte = document.getElementById('esporteJogo')?.value;
  const select = document.getElementById('campeonato');
  if (!select) return;
  if (!esporte) {
    select.innerHTML = `<option value="">— Selecione o campeonato —</option>`;
    return;
  }
  getCampeonatos(campeonatos => {
    const lista = campeonatos[esporte] || [];
    select.innerHTML = `<option value="">— Selecione o campeonato —</option>` +
      lista.map(c => {
        const nome = c.nome || c;
        const bandeira = c.bandeira || '';
        return `<option value="${nome}" data-bandeira="${bandeira}">${bandeira} ${nome}</option>`;
      }).join('');
    if (callback) callback(); // ← executa só depois de carregar
  });
}

// =================== ADMIN — JOGOS ===================
function renderAdmin() {
  const container = document.getElementById('tabelaJogos');
  if (!container) return;

  getJogos(jogos => {
    if (!jogos.length) {
      container.innerHTML = `<p class="empty-msg">Nenhum jogo cadastrado.</p>`;
      return;
    }

    const sorted = [...jogos].sort((a, b) => {
      if (a.data !== b.data) return (a.data || '').localeCompare(b.data || '');
      return a.horario.localeCompare(b.horario);
    });

    const porData = {};
    sorted.forEach(j => {
      const d = j.data || 'Sem data';
      if (!porData[d]) porData[d] = [];
      porData[d].push(j);
    });

    const hoje = hojeStr();
    let html = '';

    for (const [data, lista] of Object.entries(porData)) {
      let dataLabel = data;
      if (data !== 'Sem data') {
        const d = new Date(data + 'T12:00:00');
        dataLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      const isHoje = data === hoje;

      html += `<div class="admin-data-header ${isHoje ? 'admin-data-hoje' : ''}">
        📅 ${dataLabel}${isHoje ? ' <span class="badge-hoje">Hoje</span>' : ''}
      </div>`;

      const rows = lista.map(j => {
        const st = STATUS_LABELS[j.status] || STATUS_LABELS.agendado;
        const isLive = j.status === 'aovivo';
        const isPaused = j.status === 'pausado';
        return `<tr>
          <td><span class="hora-badge">${j.horario}</span></td>
          <td>
            <span class="jogo-nome">${j.mandante} x ${j.visitante}</span>
            <span class="jogo-camp">${j.esporte ? j.esporte + ' · ' : ''}${j.campeonato}${j.rodada ? ' · ' + j.rodada : ''}</span>
          </td>
          <td><div class="canais-list">${j.canais}</div></td>
          <td><span class="status-badge ${st.cls}">${st.label}</span></td>
          <td>
            <div class="acoes">
              ${!isLive && !isPaused && j.status !== 'encerrado' ? `<button class="btn-acao btn-live" onclick="setStatus('${j.id}','aovivo')">▶ Live</button>` : ''}
              ${isLive ? `<button class="btn-acao btn-pause" onclick="setStatus('${j.id}','pausado')">⏸</button>` : ''}
              ${isPaused ? `<button class="btn-acao btn-live" onclick="setStatus('${j.id}','aovivo')">▶</button>` : ''}
              ${j.status !== 'encerrado' ? `<button class="btn-acao btn-end" onclick="setStatus('${j.id}','encerrado')">✓ Fim</button>` : ''}
              <button class="btn-acao btn-edit" onclick="editarJogo('${j.id}')">✏️</button>
              <button class="btn-acao btn-del" onclick="deletarJogo('${j.id}')">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('');

      html += `<table class="tabela-admin">
        <thead><tr><th>Hora</th><th>Jogo</th><th>Canais</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    container.innerHTML = html;
  });
}

function setStatus(id, status) {
  getJogos(jogos => {
    const jogo = jogos.find(j => j.id === id);
    if (jogo) { jogo.status = status; saveJogo(jogo); renderAdmin(); }
  });
}

function deletarJogo(id) {
  if (!confirm('Remover este jogo?')) return;
  deleteJogo(id);
  renderAdmin();
}

function editarJogo(id) {
  getJogos(jogos => {
    const jogo = jogos.find(j => j.id === id);
    if (!jogo) return;

    document.getElementById('editId').value = jogo.id;
    document.getElementById('esporteJogo').value = jogo.esporte || '';
    carregarCampeonatosNoForm(() => {
  document.getElementById('campeonato').value = jogo.campeonato;
});
    document.getElementById('mandante').value = jogo.mandante;
    document.getElementById('visitante').value = jogo.visitante;
    document.getElementById('horario').value = jogo.horario;
    document.getElementById('rodada').value = jogo.rodada || '';
    document.getElementById('status').value = jogo.status;
    document.getElementById('canais').value = jogo.canais;
    document.getElementById('logoMandante').value = jogo.logoMandante || '';
    document.getElementById('logoVisitante').value = jogo.logoVisitante || '';
    document.getElementById('dataJogo').value = jogo.data || hojeStr();

    document.getElementById('formTitle').textContent = 'Editar Jogo';
    document.getElementById('btnSalvar').textContent = '💾 Atualizar Jogo';
    document.getElementById('btnCancelar').style.display = 'inline-block';
    document.getElementById('formJogo').scrollIntoView({ behavior: 'smooth' });
  });
}

function cancelarEdicao() {
  document.getElementById('formJogo').reset();
  document.getElementById('editId').value = '';
  document.getElementById('campeonato').innerHTML = `<option value="">— Selecione o campeonato —</option>`;
  document.getElementById('formTitle').textContent = 'Adicionar Jogo';
  document.getElementById('btnSalvar').textContent = '✅ Salvar Jogo';
  document.getElementById('btnCancelar').style.display = 'none';
  const dataField = document.getElementById('dataJogo');
if (dataField) dataField.value = hojeStr();
}

function limparTodos() {
  if (!confirm('Remover TODOS os jogos? Esta ação não pode ser desfeita.')) return;
  db.ref('jogos').remove();
  renderAdmin();
}

// =================== FORM SUBMIT ===================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formJogo');
  if (!form) return;

  document.getElementById('mandante')?.addEventListener('input', () => {
  const nome = document.getElementById('mandante').value.trim();
  const campoLogo = document.getElementById('logoMandante');
  if (!nome) { campoLogo.value = ''; return; }
  buscarEscudo(nome, url => {
    if (url) campoLogo.value = url;
  });
});

document.getElementById('visitante')?.addEventListener('input', () => {
  const nome = document.getElementById('visitante').value.trim();
  const campoLogo = document.getElementById('logoVisitante');
  if (!nome) { campoLogo.value = ''; return; }
  buscarEscudo(nome, url => {
    if (url) campoLogo.value = url;
  });
});

  // Enter nos campos de esporte/campeonato dispara o botão correto
  document.getElementById('inputNovoEsporte')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarEsporte(); }
  });
  document.getElementById('inputNovoCampeonato')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarCampeonato(); }
  });

  form.addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('editId').value;

  const jogo = {
    id: editId || gerarId(),
    esporte: document.getElementById('esporteJogo').value.trim(),
    campeonato: document.getElementById('campeonato').value.trim(),
    bandeiraCampeonato: document.getElementById('campeonato').selectedOptions[0]?.dataset.bandeira || '',
    mandante: document.getElementById('mandante').value.trim(),
    visitante: document.getElementById('visitante').value.trim(),
    horario: document.getElementById('horario').value,
    rodada: formatarRodada(document.getElementById('rodada').value.trim()),
    status: document.getElementById('status').value,
    canais: document.getElementById('canais').value.trim(),
    logoMandante: document.getElementById('logoMandante').value.trim(),
    logoVisitante: document.getElementById('logoVisitante').value.trim(),
    data: document.getElementById('dataJogo').value,
  };

  saveJogo(jogo);
  getTimes(times => {
  if (jogo.mandante && jogo.logoMandante) times[jogo.mandante.trim()] = jogo.logoMandante.trim();
  if (jogo.visitante && jogo.logoVisitante) times[jogo.visitante.trim()] = jogo.logoVisitante.trim();
  saveTimes(times);
});

  const modoLote = document.getElementById('modoLote')?.checked;
  if (modoLote) {
    const esporteSalvo = document.getElementById('esporteJogo').value;
    const campeonatoSalvo = document.getElementById('campeonato').value;
    const rodadaSalva = document.getElementById('rodada').value;
    const dataSalva = document.getElementById('dataJogo').value;

    document.getElementById('editId').value = '';
    document.getElementById('mandante').value = '';
    document.getElementById('visitante').value = '';
    document.getElementById('logoMandante').value = '';
    document.getElementById('logoVisitante').value = '';
    document.getElementById('horario').value = '';
    document.getElementById('canais').value = '';
    document.getElementById('status').value = 'agendado';

    document.getElementById('esporteJogo').value = esporteSalvo;
carregarCampeonatosNoForm(() => {
  document.getElementById('campeonato').value = campeonatoSalvo;
});
document.getElementById('rodada').value = rodadaSalva;
document.getElementById('dataJogo').value = dataSalva;
document.getElementById('modoLote').checked = true;
toggleModoLote();
  } else {
    cancelarEdicao();
  }

  setTimeout(() => renderAdmin(), 300); // aguarda Firebase gravar

  const btn = document.getElementById('btnSalvar');
  btn.textContent = '✅ Salvo!';
  setTimeout(() => { btn.textContent = '✅ Salvar Jogo'; }, 1500);
});
});