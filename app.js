// ==========================================================
// NAVEGAÇÃO ENTRE ABAS (Financeiro / Jogadores)
// ==========================================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove a classe "active" de todos os botões e conteúdos
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    // Ativa apenas o botão clicado e a aba correspondente
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ==========================================================
// MÓDULO FINANCEIRO
// ==========================================================
const formFinanceiro = document.getElementById('form-financeiro');
const listaFinanceiro = document.getElementById('lista-financeiro');
const saldoTotal = document.getElementById('saldo-total');

// Guarda todos os lançamentos financeiros vindos do Firebase,
// para serem usados depois na geração do relatório
let todosLancamentos = [];

formFinanceiro.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = document.getElementById('fin-data').value;
  const tipo = document.getElementById('fin-tipo').value;
  const valor = parseFloat(document.getElementById('fin-valor').value);
  const descricao = document.getElementById('fin-descricao').value;

  // Salva o novo lançamento no Firestore
  await db.collection('financeiro').add({
    data,
    tipo,
    valor,
    descricao,
    criadoEm: Date.now()
  });

  formFinanceiro.reset();
});

// Desenha a lista de lançamentos na tela e calcula o saldo
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

// Escuta em tempo real as mudanças na coleção "financeiro" do Firestore
db.collection('financeiro').orderBy('criadoEm', 'desc').onSnapshot(snapshot => {
  const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  todosLancamentos = registros; // atualiza a variável usada no relatório
  renderizarFinanceiro(registros);
});

// ==========================================================
// MÓDULO JOGADORES
// ==========================================================
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

// Desenha a lista de jogadores (tela normal e preview do Stories)
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

// ==========================================================
// FUNÇÃO DE DOWNLOAD/COMPARTILHAMENTO DE IMAGEM
// Compatível com Android (Chrome), iOS (Safari) e desktop,
// tanto em aba normal quanto anônima.
// ==========================================================
function compartilharOuBaixarImagem(blob, nomeArquivo, titulo) {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  const urlImagem = URL.createObjectURL(blob);

  // Função auxiliar que baixa a imagem usando um link <a> simulado.
  // Esse método é o mais compatível entre navegadores, pois não
  // depende de abrir uma nova aba (window.open), que costuma ser
  // bloqueado por configurações do navegador ou por extensões
  // instaladas (é por isso que só funcionava na aba anônima).
  function baixarComLink() {
    const link = document.createElement('a');
    link.href = urlImagem;
    link.download = nomeArquivo; // força o download em vez de navegar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libera a memória usada pela URL temporária após 1 segundo
    setTimeout(() => URL.revokeObjectURL(urlImagem), 1000);
  }

  // Tenta primeiro o compartilhamento nativo do celular (menu de
  // compartilhar do Android/iOS), que é a melhor experiência quando
  // disponível.
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    navigator.share({
      files: [arquivo],
      title: titulo
    }).catch(function (erro) {
      // Se o usuário cancelar ou o compartilhamento falhar,
      // cai no método de download direto por link.
      console.log('Compartilhamento cancelado ou falhou:', erro);
      baixarComLink();
    });
  } else {
    // Em navegadores sem suporte a compartilhamento nativo
    // (a maioria dos desktops), baixa direto por link.
    baixarComLink();
  }
}

// ==========================================================
// BOTÃO: BAIXAR IMAGEM PARA INSTAGRAM STORIES
// ==========================================================
document.getElementById('btn-baixar-imagem').addEventListener('click', () => {
  const elemento = document.getElementById('stories-preview');

  html2canvas(elemento, {
    width: 1080,
    height: 1920,
    scale: 4,
    backgroundColor: '#ffffff' // fundo branco em vez de transparente/preto
  }).then(canvas => {
    canvas.toBlob(function (blob) {
      compartilharOuBaixarImagem(blob, 'lista-jogadores-stories.png', 'Artilheiros');
    }, 'image/png');
  });
});

// ==========================================================
// BOTÃO: BAIXAR RELATÓRIO FINANCEIRO
// ==========================================================
document.getElementById('btn-baixar-relatorio').addEventListener('click', () => {
  const tipoRelatorio = document.getElementById('reportType').value;

  const agora = new Date();
  let lancamentosFiltrados = [];
  let tituloPeriodo = '';

  // Filtra os lançamentos de acordo com o período escolhido
  if (tipoRelatorio === 'mensal') {
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    lancamentosFiltrados = todosLancamentos.filter(l => {
      const data = new Date(l.data);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    tituloPeriodo = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  } else if (tipoRelatorio === 'trimestral') {
    const trimestreAtual = Math.floor(agora.getMonth() / 3);
    const anoAtual = agora.getFullYear();
    lancamentosFiltrados = todosLancamentos.filter(l => {
      const data = new Date(l.data);
      return Math.floor(data.getMonth() / 3) === trimestreAtual && data.getFullYear() === anoAtual;
    });
    tituloPeriodo = `${trimestreAtual + 1}º Trimestre de ${anoAtual}`;
  } else if (tipoRelatorio === 'anual') {
    const anoAtual = agora.getFullYear();
    lancamentosFiltrados = todosLancamentos.filter(l => {
      const data = new Date(l.data);
      return data.getFullYear() === anoAtual;
    });
    tituloPeriodo = `Ano de ${anoAtual}`;
  }

  // Avisa o usuário se não houver dados no período escolhido
  if (lancamentosFiltrados.length === 0) {
    alert('Não há lançamentos para o período selecionado.');
    return;
  }

  const totalEntradas = lancamentosFiltrados
    .filter(l => l.tipo === 'entrada')
    .reduce((soma, l) => soma + Number(l.valor), 0);

  const totalSaidas = lancamentosFiltrados
    .filter(l => l.tipo === 'saida')
    .reduce((soma, l) => soma + Number(l.valor), 0);

  const saldoFinal = totalEntradas - totalSaidas;

  // Monta as linhas da tabela do relatório
  let linhasHtml = '';
  lancamentosFiltrados.forEach(l => {
    const cor = l.tipo === 'entrada' ? '#2e7d32' : '#c62828';
    const sinal = l.tipo === 'entrada' ? '+' : '-';
    linhasHtml += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0d5ea;">${new Date(l.data).toLocaleDateString('pt-BR')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0d5ea;">${l.descricao}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0d5ea; color: ${cor}; text-align: right;">${sinal} R$ ${Number(l.valor).toFixed(2)}</td>
      </tr>
    `;
  });

  // Preenche o conteúdo visual do relatório (elemento escondido no HTML)
  const conteudo = document.getElementById('relatorio-conteudo');
  conteudo.innerHTML = `
    <div style="background: linear-gradient(135deg, #c9a7e0, #e07b39); padding: 20px; border-radius: 10px; color: #ffffff; margin-bottom: 20px;">
      <h2 style="margin: 0;">Relatório Financeiro</h2>
      <p style="margin: 4px 0 0 0;">${tituloPeriodo}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #faf7fc;">
          <th style="padding: 8px; text-align: left;">Data</th>
          <th style="padding: 8px; text-align: left;">Descrição</th>
          <th style="padding: 8px; text-align: right;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${linhasHtml}
      </tbody>
    </table>
    <div style="background: #faf7fc; padding: 16px; border-radius: 10px;">
      <p style="margin: 4px 0;">Total de entradas: <strong style="color: #2e7d32;">R$ ${totalEntradas.toFixed(2)}</strong></p>
      <p style="margin: 4px 0;">Total de saídas: <strong style="color: #c62828;">R$ ${totalSaidas.toFixed(2)}</strong></p>
      <p style="margin: 4px 0; font-size: 18px;">Saldo final: <strong style="color: #e07b39;">R$ ${saldoFinal.toFixed(2)}</strong></p>
    </div>
  `;

  // Gera a imagem do relatório e aciona o download/compartilhamento
  html2canvas(conteudo, {
    scale: 3,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    canvas.toBlob(function (blob) {
      compartilharOuBaixarImagem(blob, 'relatorio-financeiro.png', 'Relatório Financeiro');
    }, 'image/png');
  });
});