// ==========================================================================
// 1. CONFIGURAÇÕES INICIAIS, VARIÁVEIS GLOBAIS E AUTENTICAÇÃO (8 SETORES)
// ==========================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIjQ02GCL7KS3PQkXxQkasaVX8_lgypnZQeZKcdnXfN7kqFWLlsZxrSoYEJvSuCF2YWA/exec'; 

// SENHAS DE FÁBRICA COM OS 3 NOVOS SETORES ADICIONADOS
const SENHAS_PADRAO = {
    "Dised": "dised123",
    "Dioq": "dioq123",
    "Jurídico": "juridico123", 
    "Social": "social123",
    "Pedagogia": "pedagogia123",
    "Enfermaria": "enfermaria123",
    "Psicologia": "psicologia123",
    "Direção": "direcao123"
};

let setorLogadoAtualmente = "";
let paginaAtual = 1;
const limitePorPagina = 20;
let filtrarApenasPendentes = true;

function obterSenhaDoSetor(setor) {
    const senhaSalva = localStorage.getItem(`senha_ctc_${setor}`);
    return senhaSalva ? senhaSalva : SENHAS_PADRAO[setor];
}

function efetuarLogin() {
    const setorSelecionado = document.getElementById('setorLogin').value;
    const senhaDigitada = document.getElementById('senhaLogin').value;
    const painelErro = document.getElementById('erroLogin');

    if (!setorSelecionado || setorSelecionado === "") {
        alert("Por favor, selecione um Setor / Departamento antes de prosseguir!");
        return;
    }

    if (senhaDigitada.trim() === obterSenhaDoSetor(setorSelecionado).trim()) {
        painelErro.classList.add('oculto');
        document.getElementById('senhaLogin').value = "";
        setorLogadoAtualmente = setorSelecionado;
        document.getElementById('nomeSetorAtivo').innerText = setorLogadoAtualmente;
        
        document.getElementById('telaLogin').classList.add('oculto');
        document.getElementById('sistemaPrincipal').classList.remove('oculto');
        document.querySelector('.usuario-logado').classList.remove('oculto');
        
        configurarPermissoesDeTela(setorLogadoAtualmente);
    } else {
        painelErro.classList.remove('oculto');
    }
}

function fazerLogout() {
    setorLogadoAtualmente = "";
    paginaAtual = 1; 
    document.getElementById('sistemaPrincipal').classList.add('oculto');
    document.getElementById('telaLogin').classList.remove('oculto');
    document.querySelector('.usuario-logado').classList.add('oculto');
}
// ==========================================================================
// 2. ALTERAÇÃO DE SENHAS E CADASTRO DE DETENTOS COM REGISTRO DE SETOR AUTOR
// ==========================================================================

function abrirPainelSenha() { document.getElementById('blocoAlterarSenha').classList.remove('oculto'); }
function fecharPainelSenha() {
    document.getElementById('blocoAlterarSenha').classList.add('oculto');
    document.getElementById('novaSenhaInput').value = "";
    document.getElementById('confirmarNovaSenhaInput').value = "";
}

function salvarNovaSenha() {
    const novaSenha = document.getElementById('novaSenhaInput').value;
    const confirmarSenha = document.getElementById('confirmarNovaSenhaInput').value;
    if (!novaSenha || !confirmarSenha) { alert("Preencha os dois campos."); return; }
    if (novaSenha !== confirmarSenha) { alert("As senhas não são iguais!"); return; }
    localStorage.setItem(`senha_ctc_${setorLogadoAtualmente}`, novaSenha);
    alert(`Senha alterada com sucesso!`);
    fecharPainelSenha();
}

function configurarPermissoesDeTela(setor) {
    fecharPainelSenha();
    carregarHistoricoDeMemorandos(); 

    document.getElementById('blocoInclusao').classList.remove('oculto');
    document.getElementById('btnGerenciarPopup').classList.remove('oculto');
    carregarCanteirosDinamicos(); 

    if(setor === "Direção") {
        document.getElementById('btnExportar').classList.remove('oculto');
        document.getElementById('btnImprimir').classList.remove('oculto');
    } else {
        document.getElementById('btnExportar').classList.add('oculto');
        document.getElementById('btnImprimir').classList.add('oculto');
    }
    const chk = document.getElementById('chkPendentes');
    if (chk) chk.checked = filtrarApenasPendentes;
    paginaAtual = 1; 
    carregarDados();
}

document.getElementById('formPreso').addEventListener('submit', function(e) {
    e.preventDefault();
    const btnCadastro = e.target.querySelector('button[type="submit"]');
    btnCadastro.disabled = true; btnCadastro.innerText = "Cadastrando...";

    // AUDITORIA AUTOMÁTICA: Salva qual setor logado está incluindo o preso
    const dados = {
        acao: "incluirPreso", id: Date.now(),
        memorando: document.getElementById('memo').value,
        quemIncluiu: setorLogadoAtualmente, 
        nome: document.getElementById('nomePreso').value,
        prontuario: document.getElementById('prontuario').value,
        canteiro: document.getElementById('canteiroTrabalho').value
    };

    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(dados) })
    .then(() => { 
        alert('Preso incluído com sucesso!'); 
        document.getElementById('formPreso').reset(); 
        carregarDados();
        carregarHistoricoDeMemorandos();
    })
    .catch(() => { alert('Preso processado! Atualizando.'); carregarDados(); })
    .finally(() => { btnCadastro.disabled = false; btnCadastro.innerText = "Cadastrar Preso"; });
});
// ==========================================================================
// 3. ENVIO DE PARECERES INTEGRADO E NAVEGAÇÃO DE PÁGINAS
// ==========================================================================

function salvarVoto(idPreso, botaoClicado) {
    if (!botaoClicado) return;
    const linhaTr = botaoClicado.closest('tr');
    const campoDecisao = linhaTr.querySelector('select');
    const campoObservacao = linhaTr.querySelector('textarea');

    if (!campoDecisao) { alert("Campo de voto não encontrado."); return; }
    const decisao = campoDecisao.value;
    if (!decisao || decisao.trim() === "") { alert("Selecione SIM ou NÃO antes de votar!"); return; }

    botaoClicado.disabled = true; botaoClicado.innerText = "Enviando...";
    const obs = campoObservacao ? campoObservacao.value : "";

    const dadosEnvio = {
        acao: "salvarAvaliacao", idPreso: idPreso,
        setor: setorLogadoAtualmente, decisao: decisao, observacao: obs
    };

    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(dadosEnvio) })
    .then(() => { alert('Avaliação registrada com sucesso no banco de dados!'); carregarDados(); })
    .catch(err => { console.error(err); alert('Processando gravação... Sincronizando tabela.'); carregarDados(); });
}

function alternarFiltroPendentes(checkbox) { filtrarApenasPendentes = checkbox.checked; paginaAtual = 1; carregarDados(); }
function mudarPagina(direcao) { paginaAtual += direcao; carregarDados(); }

function atualizarControlesPagina(totalRegistros) {
    const btnAnterior = document.getElementById('btnPagAnterior');
    const btnProximo = document.getElementById('btnPagProxima');
    const indicador = document.getElementById('indicadorPagina');
    if (!btnAnterior || !btnProximo || !indicador) return;
    
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina) || 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    indicador.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
    btnAnterior.disabled = (paginaAtual === 1);
    btnProximo.disabled = (paginaAtual === totalPaginas);
}
// ==========================================================================
// 4. TABELA MASTER EXPANDIDA - AUDITORIA, 8 SETORES E TRAVA DE 6 MESES
// ==========================================================================

function carregarDados() {
    const corpo = document.getElementById('corpoTabela');
    const cabecalho = document.getElementById('cabecalhoTabela');
    corpo.innerHTML = '<tr><td colspan="5">Carregando dados confidenciais...</td></tr>';

    // Monta o cabeçalho dinâmico baseado no nível de acesso
    if (setorLogadoAtualmente === "Direção") {
        cabecalho.innerHTML = `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>DISED</th><th>DIOQ</th><th>JURÍDICO</th><th>SOCIAL</th><th>PEDAGOGIA</th><th>ENFERMARIA</th><th>PSICOLOGIA</th><th>Sua Avaliação (Direção)</th>`;
    } else {
        cabecalho.innerHTML = `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>Sua Avaliação (Ação)</th>`;
    }

    const elementoSelect = document.getElementById('filtroMemorando');
    const termoBuscaMemo = elementoSelect ? elementoSelect.value : "";

    const urlConsultar = `${SCRIPT_URL}?setor=${encodeURIComponent(setorLogadoAtualmente)}&pendentes=${filtrarApenasPendentes}&pagina=${paginaAtual}&limite=${limitePorPagina}&buscaMemo=${encodeURIComponent(termoBuscaMemo)}`;

    fetch(urlConsultar).then(res => res.json()).then(respostaServidor => {
        const presos = respostaServidor.dados || []; 
        const totalRegistros = respostaServidor.totalRegistros || 0;
        corpo.innerHTML = '';
        
        if (presos.length === 0) {
            corpo.innerHTML = `<tr><td colspan="${setorLogadoAtualmente === 'Direção' ? 13 : 6}">Nenhum preso aguardando avaliação.</td></tr>`;
            atualizarControlesPagina(0); return;
        }

        presos.forEach(preso => {
            const tr = document.createElement('tr');
            const canteiroTexto = preso.canteiro || "Não Informado";
            const autorCadastro = preso.quemIncluiu || "Não Informado";
            
            // INTELIGÊNCIA DE TRAVA AUTOMÁTICA DOS 6 MESES
            const votoDirecaoAnterior = preso.avaliacoes.find(a => a.setor === "Direção");
            let estaBloqueadoPorTempo = false;
            let mensagemBloqueioHtml = "";

            if (votoDirecaoAnterior && votoDirecaoAnterior.dataVoto) {
                const dataDoVoto = new Date(votoDirecaoAnterior.dataVoto);
                const dataLimiteLiberacao = new Date(dataDoVoto);
                dataLimiteLiberacao.setMonth(dataLimiteLiberacao.getMonth() + 6); // Soma os 6 meses regulamentares
                const dataHoje = new Date();

                if (dataHoje < dataLimiteLiberacao) {
                    estaBloqueadoPorTempo = true;
                    const dVotoStr = dataDoVoto.toLocaleDateString('pt-BR');
                    const dLibStr = dataLimiteLiberacao.toLocaleDateString('pt-BR');
                    mensagemBloqueioHtml = `<div class="alerta-trava-tempo">⚠️ <strong>Bloqueado (6 Meses)</strong><br><small>Avaliado em: ${dVotoStr}<br>Liberado em: ${dLibStr}</small></div>`;
                }
            }
            
            if (setorLogadoAtualmente === "Direção") {
                const formatarCelula = (setorNome) => {
                    const aval = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(setorNome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                    if (!aval) return `<span class="voto-status voto-pendente">Pendente</span>`;
                    const classeVoto = aval.decisao === "SIM" ? "voto-sim" : "voto-nao";
                    return `<span class="voto-status ${classeVoto}">${aval.decisao}</span><div class="comentario-container" title="${aval.observacao}">${aval.observacao}</div>`;
                };

                let celulaVotoDirecao = '';
                if (estaBloqueadoPorTempo) {
                    celulaVotoDirecao = mensagemBloqueioHtml;
                } else if (votoDirecaoAnterior) {
                    const classeVoto = votoDirecaoAnterior.decisao === "SIM" ? "voto-sim" : "voto-nao";
                    celulaVotoDirecao = `<span class="voto-status ${classeVoto}">${votoDirecaoAnterior.decisao}</span><div class="comentario-container">${votoDirecaoAnterior.observacao}</div>`;
                } else {
                    celulaVotoDirecao = `<select style="width:100%; margin-bottom:5px;"><option value="" selected disabled>-- Selecione --</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option></select><textarea placeholder="Decisão final..." style="min-height:50px; font-size:0.8rem;"></textarea><button onclick="salvarVoto(${preso.id}, this)" style="padding:4px 8px; font-size:0.8rem; margin-top:2px; width:100%;">Votar</button>`;
                }

                tr.innerHTML = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${autorCadastro}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td><td><strong>${canteiroTexto}</strong></td><td>${formatarCelula("Dised")}</td><td>${formatarCelula("Dioq")}</td><td>${formatarCelula("Jurídico")}</td><td>${formatarCelula("Social")}</td><td>${formatarCelula("Pedagogia")}</td><td>${formatarCelula("Enfermaria")}</td><td>${formatarCelula("Psicologia")}</td><td>${celulaVotoDirecao}</td>`;
            } else {
                let celulaAcao = '';
                const jaAvaliou = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

                if (estaBloqueadoPorTempo) {
                    celulaAcao = mensagemBloqueioHtml; // Bloqueia também a comissão comum se a Direção já encerrou o ciclo há menos de 6 meses
                } else if(jaAvaliou) {
                    const classeVoto = jaAvaliou.decisao === "SIM" ? "voto-sim" : "voto-nao";
                    celulaAcao = `<span class="voto-status ${classeVoto}">Realizada: ${jaAvaliou.decisao}</span><div class="comentario-container" style="max-width: 100%;" title="${jaAvaliou.observacao}">${jaAvaliou.observacao}</div>`;
                } else {
                    celulaAcao = `<select style="width:100%; margin-bottom:5px;"><option value="" selected disabled>-- Selecione --</option><option value="SIM">SIM (Favorável)</option><option value="NÃO">NÃO (Desfavorável)</option></select><textarea placeholder="Justificativa detalhada..."></textarea><button onclick="salvarVoto(${preso.id}, this)">Enviar Voto</button>`;
                }

                tr.innerHTML = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${autorCadastro}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td><td><strong>${canteiroTexto}</strong></td><td>${celulaAcao}</td>`;
            }
            corpo.appendChild(tr);
        });
        atualizarControlesPagina(totalRegistros);
    }).catch((err) => { console.error(err); corpo.innerHTML = '<tr><td colspan="5" style="color:red;">Erro ao buscar dados.</td></tr>'; });
}
// ==========================================================================
// 5. NOVA LÓGICA DE AUTOCOMPLETAR DUPLO, EXPORTAÇÃO E CANTEIROS
// ==========================================================================

function carregarHistoricoDeMemorandos() {
    const selectFiltro = document.getElementById('filtroMemorando');
    const datalistCadastro = document.getElementById('historicoMemorandos');
    
    if (!selectFiltro && !datalistCadastro) return;

    fetch(`${SCRIPT_URL}?buscar=memorandos`)
    .then(res => res.json())
    .then(memorandos => {
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">🔍 Filtrar por número de memorando... (Exibir Todos)</option>'; 
        }
        if (datalistCadastro) {
            datalistCadastro.innerHTML = ''; 
        }

        if (!memorandos || memorandos.length === 0) return;

        memorandos.forEach(memo => {
            if (!memo || String(memo).trim() === "") return;

            if (selectFiltro) {
                const optSelect = document.createElement('option');
                optSelect.value = memo; optSelect.textContent = memo;
                selectFiltro.appendChild(optSelect);
            }

            if (datalistCadastro) {
                const optData = document.createElement('option');
                optData.value = memo;
                datalistCadastro.appendChild(optData);
            }
        });
    })
    .catch(err => console.error("Erro ao sincronizar histórico de memorandos:", err));
}

function filtrarPorMemorando() { paginaAtual = 1; carregarDados(); }

function exportarExcel() {
    let tabela = document.getElementById("tabelaMaster"); let textoCsv = [];
    for (let i = 0; i < tabela.rows.length; i++) {
        let ServerLinha = [];
        for (let j = 0; j < tabela.rows[i].cells.length; j++) {
            let celula = tabela.rows[i].cells[j];
            ServerLinha.push('"' + (celula.querySelector('select') ? "Pendente" : celula.innerText.replace(/\n/g, " ").trim()) + '"');
        }
        textoCsv.push(ServerLinha.join(";"));
    }
    let link = document.createElement("a"); link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,\uFEFF" + textoCsv.join("\n")));
    link.setAttribute("download", "Relatorio_CTC_Direcao.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function abrirModalCanteiros() { document.getElementById('modalCanteiros').classList.remove('oculto'); carregarCanteirosDinamicos(); }
function fecharModalCanteiros() { document.getElementById('modalCanteiros').classList.add('oculto'); }

function carregarCanteirosDinamicos() {
    const selectCanteiro = document.getElementById('canteiroTrabalho');
    const corpoTabelaCanteiros = document.getElementById('corpoTabelaCanteiros');
    if (!selectCanteiro) return;

    fetch(`${SCRIPT_URL}?buscar=canteiros`).then(res => res.json()).then(canteiros => {
        selectCanteiro.innerHTML = '<option value="">-- Selecione o Canteiro --</option>';
        if (corpoTabelaCanteiros) corpoTabelaCanteiros.innerHTML = '';
        if (!canteiros || canteiros.length === 0) return;
        canteiros.forEach(nomeCanteiro => {
            if (!nomeCanteiro || String(nomeCanteiro).trim() === "") return;
            const option = document.createElement('option'); option.value = nomeCanteiro; option.textContent = nomeCanteiro; selectCanteiro.appendChild(option);
            if (corpoTabelaCanteiros) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${nomeCanteiro}</td><td style="text-align:center;"><button onclick="excluirCanteiroServidor('${nomeCanteiro}', this)" style="background:#dc2626; padding:4px 8px; margin:0;">Excluir</button></td>`;
                corpoTabelaCanteiros.appendChild(tr);
            }
        });
    }).catch(err => console.error(err));
}

function adicionarNovoCanteiroServidor() {
    const inputNome = document.getElementById('novoCanteiroNome'); const nomeCanteiro = inputNome.value.trim(); if (!nomeCanteiro) return;
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ acao: "cadastrarCanteiro", nome: nomeCanteiro }) })
    .then(() => { alert('Canteiro cadastrado!'); inputNome.value = ""; carregarCanteirosDinamicos(); }).catch(err => console.error(err));
}

function excluirCanteiroServidor(nomeCanteiro, botao) {
    if (!confirm(`Deseja remover "${nomeCanteiro}"?`)) return;
    botao.disabled = true; botao.innerText = "Removendo...";
    fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ acao: "excluirCanteiro", nome: nomeCanteiro }) })
    .then(() => { alert('Canteiro removido!'); carregarCanteirosDinamicos(); })
    .catch(() => { botao.disabled = false; botao.innerText = "Excluir"; });
}
