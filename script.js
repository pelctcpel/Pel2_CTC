// ==========================================================================
// 1. CONFIGURAÇÕES INICIAIS, VARIÁVEIS GLOBAIS E AUTENTICAÇÃO (8 SETORES)
// ==========================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIjQ02GCL7KS3PQkXxQkasaVX8_lgypnZQeZKcdnXfN7kqFWLlsZxrSoYEJvSuCF2YWA/exec'; 

// TODAS AS SENHAS DE FÁBRICA OFICIAIS ATUALIZADAS
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
        if (painelErro) painelErro.classList.add('oculto');
        document.getElementById('senhaLogin').value = "";
        setorLogadoAtualmente = setorSelecionado;
        document.getElementById('nomeSetorAtivo').innerText = setorLogadoAtualmente;
        
        document.getElementById('telaLogin').classList.add('oculto');
        document.getElementById('sistemaPrincipal').classList.remove('oculto');
        document.querySelector('.usuario-logado').classList.remove('oculto');
        
        configurarPermissoesDeTela(setorLogadoAtualmente);
        carregarDados(); // FORÇA O CARREGAMENTO OFICIAL DO BANCO IMEDIATAMENTE
    } else {
        if (painelErro) painelErro.classList.remove('oculto');
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
// 2. ALTERAÇÃO DE SENHAS E CADASTRO COM TRAVA DE SEGURANÇA DE PRONTUÁRIO
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

    // Normalização rigorosa de texto para exibir botões sem conflito de acentos
    const sLimpo = String(setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (sLimpo === "direcao") {
        document.getElementById('btnExportar').classList.remove('oculto');
        document.getElementById('btnImprimir').classList.remove('oculto');
    } else {
        document.getElementById('btnExportar').classList.add('oculto');
        document.getElementById('btnImprimir').classList.add('oculto');
    }
    const chk = document.getElementById('chkPendentes');
    if (chk) chk.checked = filtrarApenasPendentes;
    paginaAtual = 1; 
}

// TRAVA AUTOMÁTICA NO FORMULÁRIO: Impede o preso de entrar se avaliado nos últimos 6 meses pelo prontuário
document.getElementById('formPreso').addEventListener('submit', function(e) {
    e.preventDefault();
    const btnCadastro = e.target.querySelector('button[type="submit"]');
    const prontuarioDigitado = String(document.getElementById('prontuario').value).trim().toLowerCase();

    btnCadastro.disabled = true; 
    btnCadastro.innerText = "Verificando histórico por prontuário...";

    const urlVerificar = `${SCRIPT_URL}?setor=Direcao&pendentes=false&pagina=1&limite=100000`;

    fetch(urlVerificar)
    .then(res => res.json())
    .then(resposta => {
        const registros = resposta.dados || [];
        
        const historicoRecente = registros.find(preso => {
            const prontuarioBanco = String(preso.prontuario || "").trim().toLowerCase();
            if (prontuarioBanco === prontuarioDigitado) {
                const votoDirecao = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "direcao");
                if (votoDirecao && votoDirecao.dataVoto) {
                    const dataDoVoto = new Date(votoDirecao.dataVoto);
                    const dataLimite = new Date(dataDoVoto);
                    dataLimite.setMonth(dataLimite.getMonth() + 6);
                    return new Date() < dataLimite;
                }
            }
            return false;
        });

        if (historicoRecente) {
            const votoDirecao = historicoRecente.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "direcao");
            const dVoto = new Date(votoDirecao.dataVoto);
            const dLib = new Date(dVoto); dLib.setMonth(dLib.getMonth() + 6);
            
            alert(`🛑 INCLUSÃO BLOQUEADA PELA REGRA DOS 6 MESES!\n\nO interno ${historicoRecente.nome} (Prontuário: ${document.getElementById('prontuario').value}) possui parecer final concluído em ${dVoto.toLocaleDateString('pt-BR')}.\n\nUma nova comissão para este prontuário só estará liberada em: ${dLib.toLocaleDateString('pt-BR')}.`);
            
            btnCadastro.disabled = false; 
            btnCadastro.innerText = "Cadastrar Preso";
            return; 
        }

        btnCadastro.innerText = "Cadastrando...";
        const dados = {
            acao: "incluirPreso", id: Date.now(),
            memorando: document.getElementById('memo').value,
            quemIncluiu: setorLogadoAtualmente, 
            nome: document.getElementById('nomePreso').value,
            prontuario: document.getElementById('prontuario').value,
            canteiro: document.getElementById('canteiroTrabalho').value
        };

        return fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(dados) })
        .then(() => { 
            alert('Preso incluído com sucesso!'); 
            document.getElementById('formPreso').reset(); 
            carregarDados();
            carregarHistoricoDeMemorandos();
        });
    })
    .catch((err) => { 
        console.error(err);
        alert('Erro ao validar histórico na nuvem. Atualize a página e tente de novo.'); 
    })
    .finally(() => { 
        btnCadastro.disabled = false; 
        btnCadastro.innerText = "Cadastrar Preso"; 
    });
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
// 4. TABELA MASTER EXPANDIDA - AUDITORIA, 8 SETORES E SELEÇÃO DE GAVETAS BRUTAS
// ==========================================================================

function carregarDados() {
    const corpo = document.getElementById('corpoTabela');
    const cabecalho = document.getElementById('cabecalhoTabela');
    if (!corpo || !cabecalho) return;

    corpo.innerHTML = '<tr><td colspan="5">Carregando dados confidenciais...</td></tr>';

    // LIMPEZA DE TEXTO BLINDADA CONTRA CONFLITOS DE ACENTOS (Direção vira direcao)
    const setorLimpoChecagem = String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (setorLimpoChecagem === "direcao") {
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
            corpo.innerHTML = `<tr><td colspan="${setorLimpoChecagem === 'direcao' ? 13 : 6}">Nenhum preso aguardando avaliação.</td></tr>`;
            atualizarControlesPagina(0); return;
        }

        presos.forEach(preso => {
            const tr = document.createElement('tr');
            const canteiroTexto = preso.canteiro || "Não Informado";
            const autorCadastro = preso.quemIncluiu || "Não Informado";
            
            const votoDirecaoAnterior = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "direcao");
            let estaBloqueadoPorTempo = false;
            let mensagemBloqueioHtml = "";

            const ehInteligencia = votoDirecaoAnterior && votoDirecaoAnterior.decisao === "INTELIGÊNCIA";
            let carimboInteligenciaHtml = "";
            
            if (ehInteligencia) {
                tr.classList.add('linha-inteligencia');
                carimboInteligenciaHtml = `<div class="voto-inteligencia">🛑 Restrição: INTELIGÊNCIA</div>`;
            }

            if (votoDirecaoAnterior && votoDirecaoAnterior.dataVoto) {
                const dataDoVoto = new Date(votoDirecaoAnterior.dataVoto);
                const dataLimiteLiberacao = new Date(dataDoVoto);
                dataLimiteLiberacao.setMonth(dataLimiteLiberacao.getMonth() + 6);
                const dataHoje = new Date();

                if (dataHoje < dataLimiteLiberacao) {
                    estaBloqueadoPorTempo = true;
                    const dLibStr = dataLimiteLiberacao.toLocaleDateString('pt-BR');
                    mensagemBloqueioHtml = `<div class="alerta-trava-tempo">🔒 Bloqueado (6 Meses)<br><small>Liberado em: ${dLibStr}</small></div>`;
                }
            }
            
            if (setorLimpoChecagem === "direcao") {
                const formatarCelula = (setorNome) => {
                    const aval = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(setorNome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                    if (!aval) return `<span class="voto-status voto-pendente">Pendente</span>`;
                    const classeVoto = aval.decisao === "SIM" ? "voto-sim" : "voto-nao";
                    return `<span class="voto-status ${classeVoto}">${aval.decisao}</span><div class="comentario-container" title="${aval.observacao}">${aval.observacao}</div>`;
                };

                let celulaVotoDirecao = '';
                
                if (votoDirecaoAnterior) {
                    let htmlVoto = ehInteligencia ? carimboInteligenciaHtml : `<span class="voto-status ${votoDirecaoAnterior.decisao === 'SIM' ? 'voto-sim' : 'voto-nao'}">${votoDirecaoAnterior.decisao}</span>`;
                    let htmlObs = `<div class="comentario-container">${votoDirecaoAnterior.observacao}</div>`;
                    
                    celulaVotoDirecao = htmlVoto + htmlObs;
                    if (estaBloqueadoPorTempo && !ehInteligencia) {
                        celulaVotoDirecao += "<div style='margin-top:5px;'></div>" + mensagemBloqueioHtml;
                    }
                } else if (estaBloqueadoPorTempo) {
                    celulaVotoDirecao = mensagemBloqueioHtml;
                } else {
                    celulaVotoDirecao = `<select style="width:100%; margin-bottom:5px;"><option value="" selected disabled>-- Selecione --</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option><option value="INTELIGÊNCIA">INTELIGÊNCIA</option></select><textarea placeholder="Decisão final..." style="min-height:50px; font-size:0.8rem;"></textarea><button onclick="salvarVoto(${preso.id}, this)" style="padding:4px 8px; font-size:0.8rem; margin-top:2px; width:100%;">Votar</button>`;
                }

                tr.innerHTML = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${autorCadastro}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td><td><strong>${canteiroTexto}</strong></td><td>${formatarCelula("Dised")}</td><td>${formatarCelula("Dioq")}</td><td>${formatarCelula("Jurídico")}</td><td>${formatarCelula("Social")}</td><td>${formatarCelula("Pedagogia")}</td><td>${formatarCelula("Enfermaria")}</td><td>${formatarCelula("Psicologia")}</td><td>${celulaVotoDirecao}</td>`;
            } else {
                let celulaAcao = '';
                const jaAvaliou = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

                if (ehInteligencia) {
                    celulaAcao = carimboInteligenciaHtml;
                } else if (estaBloqueadoPorTempo) {
                    celulaAcao = mensagemBloqueioHtml;
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
    }).catch((err) => { console.error(err); if (corpo) corpo.innerHTML = '<tr><td colspan="5" style="color:red;">Erro ao buscar dados do servidor. Clique em Atualizar Lista.</td></tr>'; });
}
// ==========================================================================
// 5. NOVA LÓGICA DE AUTOCOMPLETAR, CANTEIROS E EMISSÃO DE ATA AUTOMÁTICA
// ==========================================================================

// ROBÔ DE REDAÇÃO DE ATAS: Mapeia as colunas por índices físicos fixos da tabela de 13 colunas da Direção
function prepararEImprimirAtaCTC() {
    const corpoTabela = document.getElementById('corpoTabela');
    const linhasPresos = corpoTabela ? corpoTabela.querySelectorAll('tr') : [];
    
    const filtroSeletor = document.getElementById('filtroMemorando');
    let numeroCTCOficial = filtroSeletor ? filtroSeletor.value.trim() : "";
    
    if (linhasPresos.length === 0) {
        alert("Não há dados de presos carregados na tabela da Direção para emitir a ata!");
        return;
    }

    let textoMontadoPresos = "";
    let numeroMemorandoCapturado = numeroCTCOficial || "______";

    linhasPresos.forEach((linha) => {
        const celulas = linha.cells;
        if (celulas.length < 5) return;

        // ÍNDICES FÍSICOS DA TABELA DE 13 COLUNAS DO PAINEL DA DIREÇÃO
        if (!numeroCTCOficial) {
            numeroMemorandoCapturado = celulas[0].innerText.trim(); // Coluna 1: Memorando
        }
        
        const nomePreso = celulas[2].innerText.trim().toUpperCase();       // Coluna 3: Nome do Detento
        const prontuarioPreso = celulas[3].innerText.trim();              // Coluna 4: Prontuário
        const canteiroProposto = celulas[4].innerText.trim().toUpperCase(); // Coluna 5: Canteiro Proposto
        
        // Puxa o veredito final da Direção que fica cravado na última coluna (Índice 12)
        let decisaoDirecao = "PENDENTE";
        const celulaVotoDirecao = celulas[12]; 
        
        if (celulaVotoDirecao) {
            if (celulaVotoDirecao.innerText.includes("SIM")) decisaoDirecao = "APROVADO";
            else if (celulaVotoDirecao.innerText.includes("NÃO")) decisaoDirecao = "INDEFERIDO";
            else if (celulaVotoDirecao.innerText.includes("INTELIGÊNCIA")) decisaoDirecao = "RETIDO PELA INTELIGÊNCIA";
        }

        if (decisaoDirecao === "APROVADO") {
            textoMontadoPresos += `Para trabalho no canteiro <b>${canteiroProposto}</b>, o preso indicado <b>${nomePreso}</b>, prontuário nº <b>${prontuarioPreso}</b>, em avaliação individual, foi <b>APROVADO por UNANIMIDADE</b> para ser transferido de seu canteiro de trabalho para implante/transferência neste setor. `;
        } else if (decisaoDirecao === "INDEFERIDO") {
            textoMontadoPresos += `Por outro lado, em análise para trabalho no canteiro <b>${canteiroProposto}</b>, com o preso indicado: <b>${nomePreso}</b>, prontuário nº <b>${prontuarioPreso}</b>, com avaliações e pareceres dos setores envolvidos, teve sua solicitação de implante, <b>"INDEFERIDA" pela DIREÇÃO da Unidade</b>. `;
        } else if (decisaoDirecao === "RETIDO PELA INTELIGÊNCIA") {
            textoMontadoPresos += `Em análise de segurança de canteiro para trabalho no canteiro <b>${canteiroProposto}</b>, o preso indicado <b>${nomePreso}</b>, prontuário nº <b>${prontuarioPreso}</b>, teve seus trâmites suspensos devido à <b>RESTRIÇÃO DE INTELIGÊNCIA</b>. `;
        }
    });

    const dataHoje = new Date();
    const mesesExtenso = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const diaExtenso = dataHoje.getDate();
    const anoExtenso = dataHoje.getFullYear();
    const textDataOficial = `Aos ${diaExtenso} dias do mês de ${mesesExtenso[dataHoje.getMonth()]} de ${anoExtenso}`;

    document.getElementById('textoDataGerada').innerText = textDataOficial;
    document.getElementById('txtNumeroMemoAta').innerText = numeroMemorandoCapturado;
    document.getElementById('blocoVotosPresosImpressao').innerHTML = textoMontadoPresos;
    document.getElementById('numAtaDinamica').innerText = `${numeroMemorandoCapturado}`;

    window.print();
}

function carregarHistoricoDeMemorandos() {
    const selectFiltro = document.getElementById('filtroMemorando');
    const datalistCadastro = document.getElementById('historicoMemorandos');
    if (!selectFiltro && !datalistCadastro) return;
    fetch(`${SCRIPT_URL}?buscar=memorandos`).then(res => res.json()).then(memorandos => {
        if (selectFiltro) selectFiltro.innerHTML = '<option value="">🔍 Filtrar por número de memorando... (Exibir Todos)</option>'; 
        if (datalistCadastro) datalistCadastro.innerHTML = '';
        if (!memorandos || memorandos.length === 0) return;
        memorandos.forEach(memo => {
            if (!memo || String(memo).trim() === "") return;
            if (selectFiltro) { const opt = document.createElement('option'); opt.value = memo; opt.textContent = memo; selectFiltro.appendChild(opt); }
            if (datalistCadastro) { const optD = document.createElement('option'); optD.value = memo; datalistCadastro.appendChild(optD); }
        });
    }).catch(err => console.error(err));
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
