// ==========================================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================================
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

// ==========================================================
// MÓDULO FINANCEIRO
// ==========================================================
const formFinanceiro = document.getElementById('form-financeiro');
const listaFinanceiro = document.getElementById('lista-financeiro');
const saldoTotal = document.getElementById('saldo-total');

let todosLancamentos = [];

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
  todosLancamentos = registros;
  renderizarFinanceiro(registros);
});

// ==========================================================
// MÓDULO JOGADORES
// ==========================================================
const formJogador = document.getElementById('form-jogador');
const listaJogadores = document.getElementById('lista-jogadores');
const listaJogadoresStories = document.getElementById('lista-jogadores-stories');
const storiesData = document.getElementById('stories-data');
const checkCompacto = document.getElementById('check-compacto');

formJogador.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('jog-nome').value;
  const gols = parseInt(document.getElementById('jog-gols').value);

  await db.collection('jogadores').add({
    nome,
    gols,
    criadoEm: Date.now(),
    atualizadoEm: Date.now()
  });

  formJogador.reset();
});

// Desenha a lista normal e a tabela no estilo "Tabela de Artilharia"
function renderizarJogadores(jogadores) {
  const ordenados = [...jogadores].sort((a, b) => b.gols - a.gols);

  listaJogadores.innerHTML = '';
  listaJogadoresStories.innerHTML = '';

  // ---- CÁLCULO CORRETO DE POSIÇÃO COM EMPATES ----
  // Cada grupo de gols iguais recebe a MESMA posição.
  // A próxima posição diferente é sempre a anterior + 1.
  let posicaoAtual = 0;
  let golsAnterior = null;

  ordenados.forEach((jog) => {
    if (jog.gols !== golsAnterior) {
      posicaoAtual += 1;
      golsAnterior = jog.gols;
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div>${posicaoAtual}º ${jog.nome}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="number" class="gols-edit" value="${jog.gols}" min="0"
          onchange="editarGols('${jog.id}', this.value)" />
        <button onclick="excluirJogador('${jog.id}')">Excluir</button>
      </div>
    `;
    listaJogadores.appendChild(li);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${posicaoAtual}º</td>
      <td>${jog.nome}</td>
      <td>${jog.gols}</td>
    `;
    listaJogadoresStories.appendChild(tr);
  });

  // Data de atualização = a mais recente entre todos os jogadores
  if (jogadores.length > 0) {
    const maisRecente = jogadores.reduce((maisNovo, jog) => {
      const dataJog = jog.atualizadoEm || jog.criadoEm || 0;
      const dataMaisNovo = maisNovo.atualizadoEm || maisNovo.criadoEm || 0;
      return dataJog > dataMaisNovo ? jog : maisNovo;
    }, jogadores[0]);

    const dataFormatada = new Date(maisRecente.atualizadoEm || maisRecente.criadoEm)
      .toLocaleDateString('pt-BR');
    storiesData.textContent = `ATUALIZADO EM: ${dataFormatada}`;
  } else {
    storiesData.textContent = `ATUALIZADO EM: ${new Date().toLocaleDateString('pt-BR')}`;
  }
}

async function editarGols(id, novoValor) {
  await db.collection('jogadores').doc(id).update({
    gols: parseInt(novoValor),
    atualizadoEm: Date.now()
  });
}

async function excluirJogador(id) {
  await db.collection('jogadores').doc(id).delete();
}

db.collection('jogadores').orderBy('criadoEm', 'desc').onSnapshot(snapshot => {
  const jogadores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderizarJogadores(jogadores);
});

// Alterna entre modo normal e modo compacto da tabela impressa
checkCompacto.addEventListener('change', () => {
  const tabela = document.getElementById('tabela-artilharia');
  const preview = document.getElementById('stories-preview');

  if (checkCompacto.checked) {
    tabela.classList.add('compacta');
    preview.classList.add('compacta');
  } else {
    tabela.classList.remove('compacta');
    preview.classList.remove('compacta');
  }
});

// ==========================================================
// FUNÇÃO DE DOWNLOAD/COMPARTILHAMENTO DE IMAGEM
// ==========================================================
function compartilharOuBaixarImagem(blob, nomeArquivo, titulo) {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  const urlImagem = URL.createObjectURL(blob);

  function baixarComLink() {
    const link = document.createElement('a');
    link.href = urlImagem;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(urlImagem), 1000);
  }

  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    navigator.share({
      files: [arquivo],
      title: titulo
    }).catch(function (erro) {
      console.log('Compartilhamento cancelado ou falhou:', erro);
      baixarComLink();
    });
  } else {
    baixarComLink();
  }
}

// ==========================================================
// BOTÃO: BAIXAR TABELA DE ARTILHARIA
// ==========================================================
document.getElementById('btn-baixar-imagem').addEventListener('click', () => {
  const elemento = document.getElementById('stories-preview');

  if (!elemento) {
    alert('Erro: elemento da tabela não encontrado no HTML.');
    return;
  }

  html2canvas(elemento, {
    width: 1080,
    scale: 2,
    backgroundColor: '#3d1152',
    useCORS: true,
    allowTaint: true
  }).then(canvas => {
    canvas.toBlob(function (blob) {
      if (!blob) {
        alert('Erro ao gerar a imagem (blob vazio).');
        return;
      }
      compartilharOuBaixarImagem(blob, 'tabela-artilharia.png', 'Tabela de Artilharia');
    }, 'image/png');
  }).catch(function (erro) {
    console.error('Erro ao gerar imagem com html2canvas:', erro);
    alert('Ocorreu um erro ao gerar a imagem. Veja o console para detalhes.');
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

  const conteudo = document.getElementById('relatorio-conteudo');
  conteudo.innerHTML = `
    <div style="background: linear-gradient(135deg, #7a2f9e, #f07d21); padding: 20px; border-radius: 10px; color: #ffffff; margin-bottom: 20px;">
      <h2 style="margin: 0;">Relatório Financeiro - Fut Coreano FC</h2>
      <p style="margin: 4px 0 0 0;">${tituloPeriodo}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f5eef9;">
          <th style="padding: 8px; text-align: left;">Data</th>
          <th style="padding: 8px; text-align: left;">Descrição</th>
          <th style="padding: 8px; text-align: right;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${linhasHtml}
      </tbody>
    </table>
    <div style="background: #f5eef9; padding: 16px; border-radius: 10px;">
      <p style="margin: 4px 0;">Total de entradas: <strong style="color: #2e7d32;">R$ ${totalEntradas.toFixed(2)}</strong></p>
      <p style="margin: 4px 0;">Total de saídas: <strong style="color: #c62828;">R$ ${totalSaidas.toFixed(2)}</strong></p>
      <p style="margin: 4px 0; font-size: 18px;">Saldo final: <strong style="color: #f07d21;">R$ ${saldoFinal.toFixed(2)}</strong></p>
    </div>
  `;

  html2canvas(conteudo, {
    scale: 3,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    canvas.toBlob(function (blob) {
      compartilharOuBaixarImagem(blob, 'relatorio-financeiro.png', 'Relatório Financeiro');
    }, 'image/png');
  });
});