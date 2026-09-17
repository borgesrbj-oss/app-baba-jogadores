// ===== NAVEGAÇÃO ENTRE ABAS =====
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ===== MÓDULO FINANCEIRO =====
const formFinanceiro = document.getElementById('form-financeiro');
const listaFinanceiro = document.getElementById('lista-financeiro');
const saldoTotal = document.getElementById('saldo-total');

formFinanceiro.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = document.getElementById('fin-data').value;
  const tipo = document.getElementById('fin-tipo').value;
  const valor = parseFloat(document.getElementById('fin-valor').value);
  const descricao = document.getElementById('fin-descricao').value;

  await db.collection('financeiro').add({
    data,
    tipo,
    valor,
    descricao,
    criadoEm: Date.now()
  });

  formFinanceiro.reset();
});

function renderizarFinanceiro(registros) {
  listaFinanceiro.innerHTML = '';
  let saldo = 0;

  registros.forEach(reg => {
    if (reg.tipo === 'entrada') {
      saldo += reg.valor;
    } else {
      saldo -= reg.valor;
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <span class="${reg.tipo}">${reg.tipo === 'entrada' ? '+' : '-'} R$ ${reg.valor.toFixed(2)}</span>
        <div style="font-size:12px; color:#888;">${reg.descricao} — ${reg.data}</div>
      </div>
      <button onclick="excluirFinanceiro('${reg.id}')">Excluir</button>
    `;
    listaFinanceiro.appendChild(li);
  });

  saldoTotal.textContent = `R$ ${saldo.toFixed(2)}`;
}

async function excluirFinanceiro(id) {
  await db.collection('financeiro').doc(id).delete();
}

db.collection('financeiro').orderBy('criadoEm', 'desc').onSnapshot(snapshot => {
  const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderizarFinanceiro(registros);
});

// ===== MÓDULO JOGADORES =====
const formJogador = document.getElementById('form-jogador');
const listaJogadores = document.getElementById('lista-jogadores');
const listaJogadoresStories = document.getElementById('lista-jogadores-stories');

formJogador.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('jog-nome').value;
  const gols = parseInt(document.getElementById('jog-gols').value);

  await db.collection('jogadores').add({
    nome,
    gols,
    criadoEm: Date.now()
  });

  formJogador.reset();
});

function renderizarJogadores(jogadores) {
  const ordenados = [...jogadores].sort((a, b) => b.gols - a.gols);

  listaJogadores.innerHTML = '';
  listaJogadoresStories.innerHTML = '';

  ordenados.forEach((jog, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>${jog.nome}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="number" class="gols-edit" value="${jog.gols}" min="0"
          onchange="editarGols('${jog.id}', this.value)" />
        <button onclick="excluirJogador('${jog.id}')">Excluir</button>
      </div>
    `;
    listaJogadores.appendChild(li);

    const liStories = document.createElement('li');
    liStories.innerHTML = `<span>${index + 1}. ${jog.nome}</span><span>${jog.gols} gols</span>`;
    listaJogadoresStories.appendChild(liStories);
  });
}

async function editarGols(id, novoValor) {
  await db.collection('jogadores').doc(id).update({
    gols: parseInt(novoValor)
  });
}

async function excluirJogador(id) {
  await db.collection('jogadores').doc(id).delete();
}

db.collection('jogadores').orderBy('criadoEm', 'desc').onSnapshot(snapshot => {
  const jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderizarJogadores(jogadores);
});

// ===== DOWNLOAD DA IMAGEM PARA INSTAGRAM STORIES =====
document.getElementById('btn-baixar-imagem').addEventListener('click', () => {
  const elemento = document.getElementById('stories-preview');

  html2canvas(elemento, {
    width: 1080,
    height: 1920,
    scale: 4,
    backgroundColor: null
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'lista-jogadores-stories.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
});