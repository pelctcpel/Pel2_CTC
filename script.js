// ==========================================================================
// 1. CONFIGURAÇÕES INICIAIS, VARIÁVEIS GLOBAIS E DICIONÁRIO DE E-MAILS
// ==========================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIjQ02GCL7KS3PQkXxQkasaVX8_lgypnZQeZKcdnXfN7kqFWLlsZxrSoYEJvSuCF2YWA/exec'; 

// Dicionário corrigido com maiúsculas/minúsculas batendo 100% com a sua aba senhas
const EMAILS_SETORES = {
    "Dioq": "dioq.pel2@policiapenal.pr.gov.br",
    "Dised": "eduardo.borges@policiapenal.pr.gov.br",
    "Jurídico": "juridica.pel2@policiapenal.pr.gov.br",
    "Social": "brunagaleano@policiapenal.pr.gov.br",
    "Pedagogia": "pedagogiapel2@policiapenal.pr.gov.br",
    "Enfermaria": "adrianabueno@policiapenal.pr.gov.br",
    "Psicologia": "cintiasantos@policiapenal.pr.gov.br",
    "Direção": "michelmh@policiapenal.pr.gov.br"
};

let setorLogadoAtualmente = "";
let paginaAtual = 1;
const limitePorPagina = 20;
let filtrarApenasPendentes = true;
function efetuarLogin() {
    const setorSelecionado = document.getElementById('setorLogin').value;
    const senhaDigitada = document.getElementById('senhaLogin').value;
    const painelErro = document.getElementById('erroLogin');
    const btnEntrar = document.querySelector('#telaLogin button');

    if (!setorSelecionado || setorSelecionado === "") {
        alert("Por favor, selecione um Setor / Departamento antes de prosseguir!");
        return;
    }
    if (!senhaDigitada || senhaDigitada.trim() === "") {
        alert("Por favor, digite a sua senha de acesso!");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.innerText = "Autenticando na Nuvem...";

    const emailSetorAlvo = EMAILS_SETORES[setorSelecionado];
    const urlCompleta = `${SCRIPT_URL}?buscar=obterSenha&setor=${encodeURIComponent(emailSetorAlvo)}`;

    fetch(urlCompleta, {
        method: "GET",
        mode: "cors",
        redirect: "follow"
    })
    .then(res => res.json())
    .then(resposta => {
        const senhaOficialNuvem = (resposta.senha || "").toString().trim();
        const senhaInseridaLimpa = senhaDigitada.trim();

        if (senhaOficialNuvem !== "" && senhaInseridaLimpa === senhaOficialNuvem) {
            if (painelErro) painelErro.classList.add('oculto');
            document.getElementById('senhaLogin').value = "";
            setorLogadoAtualmente = setorSelecionado;
            document.getElementById('nomeSetorAtivo').innerText = setorLogadoAtualmente;
            
            document.getElementById('telaLogin').classList.add('oculto');
            document.getElementById('sistemaPrincipal').classList.remove('oculto');
            if (document.querySelector('.usuario-logado')) {
                document.querySelector('.usuario-logado').classList.remove('oculto');
            }
            
            configurarPermissoesDeTela(setorLogadoAtualmente);
            carregarCanteirosDinamicos();
            
            setTimeout(() => { carregarDados(); }, 200);
        } else {
            if (painelErro) painelErro.classList.remove('oculto');
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erro de comunicação com o servidor do Google Drive. Verifique a internet.");
    })
    .finally(() => {
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar no Sistema";
    });
}
function fazerLogout() {
    setorLogadoAtualmente = "";
    paginaAtual = 1; 
    document.getElementById('sistemaPrincipal').classList.add('oculto');
    document.getElementById('telaLogin').classList.remove('oculto');
    if (document.querySelector('.usuario-logado')) {
        document.querySelector('.usuario-logado').classList.add('oculto');
    }
}

// ==========================================================================
// 2. MODAL DE ALTERAÇÃO DE SENHA COM ATUALIZAÇÃO DIRETA NA ABA "senhas"
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
    const btnSalvar = document.querySelector('#blocoAlterarSenha button');

    if (!novaSenha || !confirmarSenha) { alert("Preencha os dois campos."); return; }
    if (novaSenha !== confirmarSenha) { alert("As senhas não são iguais!"); return; }

    const emailDoSetorLogado = EMAILS_SETORES[setorLogadoAtualmente];

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Gravando na Planilha...";

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        body: JSON.stringify({
            acao: "alterarSenhaSetor",
            setor: emailDoSetorLogado,
            novaSenha: novaSenha.trim()
        })
    })
    .then(res => res.json())
    .then(resposta => {
        if (resposta.sucesso) {
            alert(`Senha do setor ${setorLogadoAtualmente} alterada com sucesso na nuvem!`);
            fecharPainelSenha();
        } else {
            alert("Erro do Servidor: " + (resposta.mensagem || "Falha ao gravar."));
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erro de conexão ao tentar salvar a nova senha na nuvem.");
    })
    .finally(() => {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Senha";
    });
}
function configurarPermissoesDeTela(setor) {
    fecharPainelSenha();
    carregarHistoricoDeMemorandos(); 

    if (document.getElementById('blocoInclusao')) document.getElementById('blocoInclusao').classList.remove('oculto');
    if (document.getElementById('btnGerenciarPopup')) document.getElementById('btnGerenciarPopup').classList.remove('oculto');

    const sLimpo = String(setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (sLimpo === "direcao") {
        if (document.getElementById('btnExportar')) document.getElementById('btnExportar').classList.remove('oculto');
        if (document.getElementById('btnImprimir')) document.getElementById('btnImprimir').classList.remove('oculto');
    } else {
        if (document.getElementById('btnExportar')) document.getElementById('btnExportar').classList.add('oculto');
        if (document.getElementById('btnImprimir')) document.getElementById('btnImprimir').classList.add('oculto');
    }
    const chk = document.getElementById('chkPendentes');
    if (chk) chk.checked = filtrarApenasPendentes;
    paginaAtual = 1; 
}
// ==========================================================================
// 3. REGISTRO DE DETENTOS COM CHECAGEM DE RETENÇÃO DOS 6 MESES
// ==========================================================================

if (document.getElementById('formPreso')) {
    document.getElementById('formPreso').addEventListener('submit', function(e) {
        e.preventDefault();
        const btnCadastro = e.target.querySelector('button[type="submit"]');
        const prontuarioDigitado = String(document.getElementById('prontuario').value).trim().toLowerCase();

        btnCadastro.disabled = true; 
        btnCadastro.innerText = "Verificando histórico por prontuário...";

        fetch(`${SCRIPT_URL}?setor=Direcao&pendentes=false&pagina=1&limite=100000`, { method: "GET", mode: "cors", redirect: "follow" })
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
                btnCadastro.disabled = false; btnCadastro.innerText = "Cadastrar Preso";
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

            return fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify(dados) })
            .then(() => { 
                alert('Preso incluído com sucesso!'); 
                document.getElementById('formPreso').reset(); 
                carregarCanteirosDinamicos();
                setTimeout(() => { carregarDados(); }, 300);
                carregarHistoricoDeMemorandos();
            });
        })
        .catch(err => { console.error(err); alert('Erro ao validar histórico na nuvem.'); })
        .finally(() => { btnCadastro.disabled = false; btnCadastro.innerText = "Cadastrar Preso"; });
    });
}

function salvarVoto(idPreso, botaoClicado) {
    if (!botaoClicado) return;
    const linhaTr = botaoClicado.closest('tr');
    const campoDecisao = linhaTr.querySelector('select');
    const campoObservacao = linhaTr.querySelector('textarea');

    if (!campoDecisao) { alert("Campo de voto não encontrado."); return; }
    const decisao = campoDecisao.value;
    if (!decisao || decisao.trim() === "") { alert("Selecione uma decisão antes de votar!"); return; }

    // Normalização rigorosa para checar se o setor logado é a Direção
    const setorLimpo = String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Regra de validação: Só obriga a justificativa se NÃO for a Direção
    if (setorLimpo !== "direcao") {
        if (!campoObservacao || campoObservacao.value.trim() === "") {
            alert("Atenção: É obrigatório digitar uma justificativa detalhada!");
            if (campoObservacao) { campoObservacao.focus(); campoObservacao.style.borderColor = "#dc2626"; }
            return; 
        }
    }

    if (campoObservacao) campoObservacao.style.borderColor = "#cbd5e1";
    botaoClicado.disabled = true; botaoClicado.innerText = "Enviando...";
    
    // Captura o texto digitado ou envia vazio caso o Diretor não queira preencher
    const textoJustificativa = campoObservacao ? campoObservacao.value.trim() : "";

    // CORREÇÃO CRÍTICA: Envia estritamente em formato JSON utilizando a ação correta exigida pelo seu Apps Script
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        body: JSON.stringify({ 
            acao: "salvarAvaliacao", 
            idPreso: idPreso, 
            setor: setorLogadoAtualmente, 
            decisao: decisao, 
            observacao: textoJustificativa 
        })
    })
    .then(() => { 
        alert('Avaliação registrada com sucesso!'); 
        carregarDados(); 
    })
    .catch(err => { 
        console.error(err); 
        alert('Erro ao salvar voto. Sincronizando tabelas...'); 
        carregarDados(); 
    });
}


function alternarFiltroPendentes(checkbox) { filtrarApenasPendentes = checkbox.checked; paginaAtual = 1; carregarDados(); }
function mudarPagina(direcao) { paginaAtual += direcao; carregarDados(); }

function atualizarControlesPagina(totalRegistros) {
    const btnAnterior = document.getElementById('btnPagAnterior');
    const btnProximo = document.getElementById('btnPagProxima');
    const indicador = document.getElementById('indicadorPagina');
    if (!btnAnterior || !btnProximo || !indicador) return;
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina) || 1;
    indicador.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
    btnAnterior.disabled = (paginaAtual === 1);
    btnProximo.disabled = (paginaAtual === totalPaginas);
}
// ==========================================================================
// 4. ATUALIZAÇÃO DE CANTEIROS E MAPEAMENTO DE LINHAS DA TABELA MASTER
// ==========================================================================

function atualizarCanteiroPreso(idPreso, seletorCanteiro) {
    const novoCanteiroValor = seletorCanteiro.value;
    if (!novoCanteiroValor) return;
    seletorCanteiro.style.background = "#fef08a"; 
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "editarCanteiro", idPreso: idPreso, novoCanteiro: novoCanteiroValor }) })
    .then(res => res.json())
    .then(resposta => {
        if (resposta.sucesso) { seletorCanteiro.style.background = "#d1fae5"; setTimeout(() => { seletorCanteiro.style.background = "white"; }, 1500); }
        else { alert("Erro ao salvar canteiro."); seletorCanteiro.style.background = "#fee2e2"; }
    }).catch(() => { seletorCanteiro.style.background = "white"; });
}

function carregarDados() {
    const corpo = document.getElementById('corpoTabela');
    const cabecalho = document.getElementById('cabecalhoTabela');
    if (!corpo || !cabecalho) return;

    corpo.innerHTML = '<tr><td colspan="13" style="text-align:center; font-weight:bold; color:#1e3a8a;">Sincronizando dados confidenciais...</td></tr>';
    
    const setorLimpoChecagem = String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    cabecalho.innerHTML = setorLimpoChecagem === "direcao" ? 
        `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>DISED</th><th>DIOQ</th><th>JURÍDICO</th><th>SOCIAL</th><th>PEDAGOGIA</th><th>ENFERMARIA</th><th>PSICOLOGIA</th><th>Sua Avaliação (Direção)</th>` :
        `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>Sua Avaliação (Ação)</th>`;

    const termoBuscaMemo = document.getElementById('filtroMemorando') ? document.getElementById('filtroMemorando').value : "";

    fetch(`${SCRIPT_URL}?buscar=canteiros`, { method: "GET", mode: "cors", redirect: "follow" })
    .then(res => res.json())
    .then(listaCanteiros => {
        let opcoesCanteirosHtml = '<option value="" disabled>-- Opções --</option>';
        if (Array.isArray(listaCanteiros)) {
            listaCanteiros.forEach(c => { if(c) opcoesCanteirosHtml += `<option value="${c}">${c}</option>`; });
        }

        fetch(`${SCRIPT_URL}?setor=${encodeURIComponent(setorLogadoAtualmente)}&pendentes=${filtrarApenasPendentes}&pagina=${paginaAtual}&limite=${limitePorPagina}&buscaMemo=${encodeURIComponent(termoBuscaMemo)}`, { method: "GET", mode: "cors", redirect: "follow" })
        .then(res => res.json())
        .then(respostaServidor => {
            const presos = respostaServidor.dados || []; 
            corpo.innerHTML = '';
            
            if (presos.length === 0) { 
                corpo.innerHTML = `<tr><td colspan="13" style="text-align:center; color:#64748b;">Nenhum preso aguardando avaliação.</td></tr>`; 
                atualizarControlesPagina(0); 
                return; 
            }
                       presos.forEach(preso => {
                const tr = document.createElement('tr');
                
                tr.setAttribute('data-memorando', preso.memorando || ""); 
                tr.setAttribute('data-nome', preso.nome || ""); 
                tr.setAttribute('data-prontuario', preso.prontuario || ""); 
                tr.setAttribute('data-canteiro', preso.canteiro || "");
                tr.setAttribute('DATA-MEMORANDO', preso.memorando || ""); 
                tr.setAttribute('DATA-NOME', preso.nome || ""); 
                tr.setAttribute('DATA-PRONTUARIO', preso.prontuario || ""); 
                tr.setAttribute('DATA-CANTEIRO', preso.canteiro || "");

                const canteiroTexto = preso.canteiro || "Não Informado";
                const votoDirecaoAnterior = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "direcao");
                let estaBloqueadoPorTempo = false; 
                let mensagemBloqueioHtml = "";
                
                // Rastreamento universal que intercepta o bug "PONTO DA FESTA"
                let ehInteligencia = false;
                if (votoDirecaoAnterior) {
                    const decisaoTexto = String(votoDirecaoAnterior.decisao || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const observacaoTexto = String(votoDirecaoAnterior.observacao || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    
                    if (decisaoTexto.includes("INTELIGENCIA") || observacaoTexto.includes("INTELIGENCIA") || decisaoTexto.includes("PONTO DA FESTA")) {
                        ehInteligencia = true;
                    }
                }
                
                if (ehInteligencia) {
                    tr.classList.add('linha-inteligencia');
                    tr.style.backgroundColor = "#fff5f5"; 
                }

                if (votoDirecaoAnterior && votoDirecaoAnterior.dataVoto && !ehInteligencia) {
                    const dataLimiteLiberacao = new Date(votoDirecaoAnterior.dataVoto); 
                    dataLimiteLiberacao.setMonth(dataLimiteLiberacao.getMonth() + 6);
                    if (new Date() < dataLimiteLiberacao) { 
                        estaBloqueadoPorTempo = true; 
                        mensagemBloqueioHtml = `<div class="alerta-trava-tempo" style="background:#fff1f2; color:#991b1b; padding:4px; border:1px solid #fee2e2; border-radius:4px; font-size:0.8rem; font-weight:bold;">🔒 Bloqueado (6 Meses)<br><small>Liberado em: ${dataLimiteLiberacao.toLocaleDateString('pt-BR')}</small></div>`; 
                    }
                }

                let celulaCanteiroHtml = `<strong>${canteiroTexto}</strong>`;
                if ((setorLimpoChecagem === "direcao" || setorLimpoChecagem === "dioq") && !ehInteligencia) {
                    celulaCanteiroHtml = `<select onchange="atualizarCanteiroPreso(${preso.id}, this)" style="padding:4px; font-size:0.85rem; width:120px;">${opcoesCanteirosHtml}</select>`;
                    setTimeout(() => { const sel = tr.querySelector('select'); if (sel) sel.value = canteiroTexto; }, 10);
                }

                if (setorLimpoChecagem === "direcao") {
                    const formatarCelula = (s) => {
                        if (ehInteligencia) return `<span class="voto-inteligencia" style="color:#dc2626; font-weight:bold;">Bloqueado</span>`;
                        const aval = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                        if (!aval) return `<span class="voto-status voto-pendente">Pendente</span>`;
                        return `<span class="voto-status ${aval.decisao === 'SIM' ? 'voto-sim' : 'voto-nao'}">${aval.decisao}</span><div class="comentario-container">${aval.observacao}</div>`;
                    };

                    let celulaVotoDirecao = '';
                    if (votoDirecaoAnterior) {
                        celulaVotoDirecao = ehInteligencia ? 
                            `<div class="alerta-trava-tempo" style="background:#fff1f2; color:#dc2626; padding:8px; border:1px solid #fecdd3; border-radius:4px; font-size:0.85rem; font-weight:bold; text-align:center;">🔒 Bloqueado pela Inteligência</div>` : 
                            `<span class="voto-status ${votoDirecaoAnterior.decisao === 'SIM' ? 'voto-sim' : 'voto-nao'}">${votoDirecaoAnterior.decisao}</span><div class="comentario-container">${votoDirecaoAnterior.observacao}</div>`;
                        
                        // CORREÇÃO AQUI: Variável corrigida para mensagemBloqueioHtml (com n)
                        if (estaBloqueadoPorTempo && !ehInteligencia) celulaVotoDirecao += mensagemBloqueioHtml;
                    } else { 
                        celulaVotoDirecao = `<select style="width:100%; margin-bottom:5px;"><option value="" selected disabled>-- Selecione --</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option><option value="INTELIGÊNCIA">INTELIGÊNCIA</option></select><textarea placeholder="Decisão..."></textarea><button type="button" onclick="salvarVoto(${preso.id}, this)">Votar</button>`; 
                    }

                    tr.innerHTML = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${preso.quemIncluiu}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td><td>${celulaCanteiroHtml}</td><td>${formatarCelula("Dised")}</td><td>${formatarCelula("Dioq")}</td><td>${formatarCelula("Jurídico")}</td><td>${formatarCelula("Social")}</td><td>${formatarCelula("Pedagogia")}</td><td>${formatarCelula("Enfermaria")}</td><td>${formatarCelula("Psicologia")}</td><td>${celulaVotoDirecao}</td>`;
                } else {
                    let celulaAcao = '';
                    const jaAvaliou = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                    
                    if (ehInteligencia) { 
                        celulaAcao = `<div class="alerta-trava-tempo" style="background:#fff1f2; color:#dc2626; padding:8px; border:1px solid #fecdd3; border-radius:4px; font-size:0.85rem; font-weight:bold; text-align:center; width:100%;">🔒 Bloqueado pela Inteligência</div>`; 
                    } else if (estaBloqueadoPorTempo) { 
                        celulaAcao = mensagemBloqueioHtml; 
                    } else if(jaAvaliou) { 
                        celulaAcao = `<span class="voto-status ${jaAvaliou.decisao === 'SIM' ? 'voto-sim' : 'voto-nao'}">Realizada: ${jaAvaliou.decisao}</span><div class="comentario-container">${jaAvaliou.observacao}</div>`; 
                    } else { 
                        celulaAcao = `<select style="width:100%; margin-bottom:5px;"><option value="" selected disabled>-- Selecione --</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option></select><textarea placeholder="Justificativa..."></textarea><button type="button" onclick="salvarVoto(${preso.id}, this)">Votar</button>`; 
                    }

                    tr.innerHTML = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${preso.quemIncluiu}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td><td>${celulaCanteiroHtml}</td><td>${celulaAcao}</td>`;
                }
                corpo.appendChild(tr);
            });
            atualizarControlesPagina(respostaServidor.totalRegistros || 0);
        }).catch(err => { console.error(err); });
    }).catch(err => { 
        console.error(err);
        if (corpo) corpo.innerHTML = '<tr><td colspan="13" style="text-align:center; font-weight:bold; color:#dc2626;">Erro na sincronização.</td></tr>';
    });
}


// ==========================================================================
// 5. MOTOR INTELIGENTE DE GERAÇÃO TEXTUAL DE ATA PREMIUM (CORREÇÃO FIREFOX)
// ==========================================================================

function prepararEImprimirAtaCTC() {
    const linhasPresos = document.getElementById('corpoTabela') ? document.getElementById('corpoTabela').querySelectorAll('tr') : [];
    if (linhasPresos.length === 0 || (linhasPresos.length === 1 && linhasPresos.innerText.includes("Sincronizando"))) { 
        alert("Não há dados carregados na tabela para emitir a ata!"); 
        return; 
    }

    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) btnImprimir.disabled = true;

    let textoMontadoPresos = ""; 
    let numeroMemorandoCapturado = document.getElementById('filtroMemorando') ? document.getElementById('filtroMemorando').value.trim() : "";
    let encontrouPresoValido = false;

    linhasPresos.forEach((linha) => {
        const m = linha.getAttribute('data-memorando') || linha.getAttribute('DATA-MEMORANDO');
        const n = linha.getAttribute('data-nome') || linha.getAttribute('DATA-NOME');
        const p = linha.getAttribute('data-prontuario') || linha.getAttribute('DATA-PRONTUARIO');
        const c = inline = linha.getAttribute('data-canteiro') || linha.getAttribute('DATA-CANTEIRO');
        
        if (!n || !p || !c) return; 
        encontrouPresoValido = true;
        if (!numeroMemorandoCapturado || numeroMemorandoCapturado === "") { numeroMemorandoCapturado = m; }
        
        let decisaoDirecao = "PENDENTE"; 
        const celulaVotoDirecao = linha.cells[linha.cells.length - 1]; 
        if (celulaVotoDirecao) { 
            const txt = celulaVotoDirecao.innerText.toUpperCase(); 
            if (txt.includes("SIM")) decisaoDirecao = "APROVADO"; 
            else if (txt.includes("NÃO")) decisaoDirecao = "INDEFERIDO"; 
            else if (txt.includes("INTELIGÊNCIA")) decisaoDirecao = "RETIDO PELA INTELIGÊNCIA"; 
        }

        if (decisaoDirecao === "APROVADO") {
            textoMontadoPresos += `Para trabalho no canteiro <b>${c.toUpperCase()}</b>, o preso indicado <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, em avaliação individual, foi <b>APROVADO por UNANIMIDADE</b> para ser transferido de seu canteiro de trabalho para implante/transferência neste setor. `;
        } else if (decisaoDirecao === "INDEFERIDO") {
            textoMontadoPresos += `Por outro lado, em análise para trabalho no canteiro <b>${c.toUpperCase()}</b>, com o preso indicado: <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, com avaliações e pareceres dos setores envolvidos, teve sua solicitação de implante, <b>"INDEFERIDA" pela DIREÇÃO da Unidade</b>. `;
        } else if (decisaoDirecao === "RETIDO PELA INTELIGÊNCIA") {
            textoMontadoPresos += `Em análise de segurança de canteiro para trabalho no canteiro <b>${c.toUpperCase()}</b>, o preso indicado <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, teve seus trâmites suspensos devido à <b>RESTRIÇÃO E INDEFERIDO PELA COMISSÃO</b>. `;
        } else {
            textoMontadoPresos += `O processo do interno <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, indicado para o canteiro <b>${c.toUpperCase()}</b>, encontra-se atualmente em fase de análise e parecer técnico pelos membros desta comissão técnica. `;
        }
    });

    if (!encontrouPresoValido || textoMontadoPresos === "") { 
        alert("Nenhum registro de preso válido ou avaliado foi localizado para gerar a impressão!"); 
        if (btnImprimir) btnImprimir.disabled = false;
        return; 
    }
    
    const dataHoje = new Date();
    const diasExtenso = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte", "vinte e um", "vinte e dois", "vinte e três", "vinte e quatro", "vinte e cinco", "vinte e seis", "vinte e sete", "vinte e oito", "vinte e nove", "trinta", "trinta e um"];
    const mesesExtenso = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    
    const textDataOficial = `Aos ${diasExtenso[dataHoje.getDate()]} dias do mês de ${mesesExtenso[dataHoje.getMonth()]} de dois mil e vinte e seis`;
    
    const textoIntroducaoLimpo = `${textDataOficial}, foi elaborado pela DIOQ, o Memorando N°<b>${numeroMemorandoCapturado || "______"}</b>, com a indicação dos canteiros de trabalho, vagas disponíveis a serem preenchidos pelos presos desta unidade, que são avaliados individualmente, segundo critérios estipulados em determinação da Direção da Unidade, pelos membros da Comissão Técnica de Classificação, ou seja, dos setores de Segurança, Jurídico, Social, Psicologia, Saúde, Pedagogia, Enfermaria, DIOQE e Direção Geral. No levantamento das informações contidas na comissão web, relata-se que:`;

    // CORREÇÃO DEFINITIVA: Seleciona o elemento pai (.corpo-texto-ata) e reconstrói o HTML do zero, eliminando qualquer duplicação residual
    const elementoTextoData = document.getElementById('textoDataGerada');
    if (elementoTextoData) {
        const conteinerPai = elementoTextoData.parentElement;
        if (conteinerPai) {
            conteinerPai.innerHTML = `
                <p class="recuo-paragrafo-ata">${textoIntroducaoLimpo}</p>
                <p class="recuo-paragrafo-ata" style="margin-top: 15px !important;" id="blocoVotosPresosImpressao">${textoMontadoPresos}</p>
                <p class="fechamento-ata-paragrafo">Concluindo, é lavrada esta ata, que vai assinada pelos membros da comissão técnica avaliadora da PEL2.</p>
            `;
        }
    }
    
    if (document.getElementById('numAtaDinamica')) {
        document.getElementById('numAtaDinamica').innerText = numeroMemorandoCapturado || "______";
    }
    
    setTimeout(function() { 
        window.print(); 
        if (btnImprimir) btnImprimir.disabled = false;
    }, 400);
}


function carregarHistoricoDeMemorandos() {
    const selectFiltro = document.getElementById('filtroMemorando'), datalistCadastro = document.getElementById('historicoMemorandos');
    if (!selectFiltro && !datalistCadastro) return;
    fetch(`${SCRIPT_URL}?buscar=memorandos`, { method: "GET", mode: "cors", redirect: "follow" }).then(res => res.json()).then(memorandos => {
        if (selectFiltro) selectFiltro.innerHTML = '<option value="">🔍 Filtrar por número de memorando...</option>'; 
        if (datalistCadastro) datalistCadastro.innerHTML = '';
        memorandos.forEach(memo => { if (memo) { if (selectFiltro) { const opt = document.createElement('option'); opt.value = memo; opt.textContent = memo; selectFiltro.appendChild(opt); } if (datalistCadastro) { const optD = document.createElement('option'); optD.value = memo; datalistCadastro.appendChild(optD); } } });
    }).catch(err => console.error(err));
}

function filtrarPorMemorando() { paginaAtual = 1; carregarDados(); }

async function exportarExcel() {
    const tabela = document.getElementById('tabelaMaster');
    if (!tabela) {
        alert("Erro: Estrutura da tabela não encontrada na página!");
        return;
    }

    const linhas = tabela.querySelectorAll('tbody tr');
    if (linhas.length === 0 || (linhas.length === 1 && linhas.innerText.includes("Sincronizando"))) {
        alert("Não há registros carregados na tabela para realizar a exportação!");
        return;
    }

    // Sinaliza no botão que o processamento começou
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.disabled = true;
        btnExportar.innerText = "⌛ Processando...";
    }

    try {
        // CORREÇÃO DEFINITIVA: Se o navegador não carregou o SheetJS pelo HTML, puxa a biblioteca dinamicamente por CDN seguro
        if (typeof XLSX === 'undefined') {
            console.log("Injetando biblioteca SheetJS em tempo de execução...");
            await new Promise((resolver, rejeitar) => {
                const scriptCdn = document.createElement('script');
                scriptCdn.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                scriptCdn.onload = resolver;
                scriptCdn.onerror = rejeitar;
                document.head.appendChild(scriptCdn);
            });
        }

        const selectFiltro = document.getElementById('filtroMemorando');
        const memoAtivo = selectFiltro && selectFiltro.value ? selectFiltro.value.replace(/[\/\\?%*:|"<>\s]/g, "_") : "GERAL";

        const dadosExcel = [
            ["Memorando", "Quem Incluiu", "Nome do Interno", "Prontuário", "Canteiro Proposto", "DISED", "DIOQ", "JURÍDICO", "SOCIAL", "PEDAGOGIA", "ENFERMARIA", "PSICOLOGIA", "AVALIAÇÃO FINAL (DIREÇÃO)"]
        ];

        linhas.forEach(linha => {
            if (linha.cells.length < 5) return; 

            const linhaDados = [];
            for (let i = 0; i < linha.cells.length; i++) {
                let textoCelula = linha.cells[i].innerText || "";
                
                const selectInterno = linha.cells[i].querySelector('select');
                if (selectInterno) {
                    textoCelula = selectInterno.value || "PENDENTE";
                } else {
                    textoCelula = textoCelula.replace(/\r?\n|\r/g, " ").trim();
                }
                linhaDados.push(textoCelula);
            }
            dadosExcel.push(linhaDados);
        });

        // Executa a montagem e download através do motor XLSX
        const livroTrabalho = XLSX.utils.book_new();
        const planilhaDados = XLSX.utils.aoa_to_sheet(dadosExcel);

        const largurasColunas = dadosExcel.map((_, indiceColuna) => {
            let tamanhoMaximo = Math.max(...dadosExcel.map(linha => (linha[indiceColuna] ? linha[indiceColuna].toString().length : 10)));
            return { wch: tamanhoMaximo + 3 }; 
        });
        planilhaDados['!cols'] = largurasColunas;

        XLSX.utils.book_append_sheet(livroTrabalho, planilhaDados, "Avaliações CTC");
        XLSX.writeFile(livroTrabalho, `Ata_CTC_Memo_${memoAtivo}_PEL2.xlsx`);

    } catch (erro) {
        console.error("Falha ao exportar:", erro);
        alert("Erro técnico ao processar a planilha. Verifique sua conexão de internet.");
    } finally {
        // Restaura o botão original após o término da operação
        if (btnExportar) {
            btnExportar.disabled = false;
            btnExportar.innerText = "Exportar Excel";
        }
    }
}





function abrirModalCanteiros() { if (document.getElementById('modalCanteiros')) { document.getElementById('modalCanteiros').classList.remove('oculto'); carregarCanteirosDinamicos(); } }
function fecharModalCanteiros() { if (document.getElementById('modalCanteiros')) document.getElementById('modalCanteiros').classList.add('oculto'); }

function carregarCanteirosDinamicos() {
    const selectCanteiro = document.getElementById('canteiroTrabalho'), corpoTabelaCanteiros = document.getElementById('corpoTabelaCanteiros');
    if (!selectCanteiro) return;
    fetch(`${SCRIPT_URL}?buscar=canteiros`, { method: "GET", mode: "cors", redirect: "follow" }).then(res => res.json()).then(canteiros => {
        selectCanteiro.innerHTML = '<option value="">-- Selecione o Canteiro --</option>'; if (corpoTabelaCanteiros) corpoTabelaCanteiros.innerHTML = '';
        canteiros.forEach(nomeCanteiro => { if (nomeCanteiro) { const option = document.createElement('option'); option.value = nomeCanteiro; option.textContent = nomeCanteiro; selectCanteiro.appendChild(option); if (corpoTabelaCanteiros) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${nomeCanteiro}</td><td style="text-align:center;"><button onclick="excluirCanteiroServidor('${nomeCanteiro}', this)">Excluir</button></td>`; corpoTabelaCanteiros.appendChild(tr); } } });
    }).catch(err => console.error(err));
}

function adicionarNovoCanteiroServidor() {
    const inputNome = document.getElementById('novoCanteiroNome'), nomeCanteiro = inputNome ? inputNome.value.trim() : ""; if (!nomeCanteiro) return;
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "cadastrarCanteiro", nome: nomeCanteiro }) }).then(() => { alert('Canteiro cadastrado!'); if (inputNome) inputNome.value = ""; carregarCanteirosDinamicos(); });
}

function excluirCanteiroServidor(nomeCanteiro, botao) {
    if (!confirm(`Deseja remover "${nomeCanteiro}"?`)) return; botao.disabled = true;
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "excluirCanteiro", nome: nomeCanteiro }) }).then(() => { alert('Canteiro removido!'); carregarCanteirosDinamicos(); });
}
