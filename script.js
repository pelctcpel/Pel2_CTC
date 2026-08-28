// ==========================================================================
// 1. CONFIGURAÇÕES INICIAIS, VARIÁVEIS GLOBAIS E DICIONÁRIO DE E-MAILS
// ==========================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIjQ02GCL7KS3PQkXxQkasaVX8_lgypnZQeZKcdnXfN7kqFWLlsZxrSoYEJvSuCF2YWA/exec'; 

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

    if (!setorSelecionado || setorSelecionado === "" || !senhaDigitada || senhaDigitada.trim() === "") {
        alert("Por favor, selecione seu setor e insira a senha autorizada!");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.innerText = "Autenticando na Nuvem...";

    const urlCompleta = `${SCRIPT_URL}?buscar=obterSenha&setor=${encodeURIComponent(EMAILS_SETORES[setorSelecionado])}`;

    fetch(urlCompleta, { method: "GET", mode: "cors", redirect: "follow" })
    .then(res => res.json())
    .then(resposta => {
        const senhaOficialNuvem = (resposta.senha || "").toString().trim();
        if (senhaOficialNuvem !== "" && senhaDigitada.trim() === senhaOficialNuvem) {
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
    .catch(() => { alert("Erro de comunicação com o servidor."); })
    .finally(() => { btnEntrar.disabled = false; btnEntrar.innerText = "Entrar no Sistema"; });
}
function fazerLogout() {
    setorLogadoAtualmente = ""; paginaAtual = 1; 
    document.getElementById('sistemaPrincipal').classList.add('oculto');
    document.getElementById('telaLogin').classList.remove('oculto');
    if (document.querySelector('.usuario-logado')) document.querySelector('.usuario-logado').classList.add('oculto');
}

function abrirPainelSenha() { document.getElementById('blocoAlterarSenha').classList.remove('oculto'); }
function fecharPainelSenha() {
    document.getElementById('blocoAlterarSenha').classList.add('oculto');
    document.getElementById('novaSenhaInput').value = ""; document.getElementById('confirmarNovaSenhaInput').value = "";
}

function salvarNovaSenha() {
    const novaSenha = document.getElementById('novaSenhaInput').value;
    const confirmarSenha = document.getElementById('confirmarNovaSenhaInput').value;
    const btnSalvar = document.querySelector('#blocoAlterarSenha button');
    if (novaSenha !== confirmarSenha) { alert("As senhas não são iguais!"); return; }

    btnSalvar.disabled = true; btnSalvar.innerText = "Gravando na Planilha...";
    fetch(SCRIPT_URL, {
        method: 'POST', mode: 'cors', redirect: 'follow',
        body: JSON.stringify({ acao: "alterarSenhaSetor", setor: EMAILS_SETORES[setorLogadoAtualmente], novaSenha: novaSenha.trim() })
    })
    .then(res => res.json()).then(resposta => {
        if (resposta.sucesso) { alert("Senha alterada com sucesso!"); fecharPainelSenha(); }
    }).finally(() => { btnSalvar.disabled = false; btnSalvar.innerText = "Salvar Senha"; });
}
function configurarPermissoesDeTela(setor) {
    fecharPainelSenha(); carregarHistoricoDeMemorandos(); 
    const sLimpo = String(setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (sLimpo === "direcao") {
        if (document.getElementById('btnExportar')) document.getElementById('btnExportar').classList.remove('oculto');
        if (document.getElementById('btnImprimir')) document.getElementById('btnImprimir').classList.remove('oculto');
    } else {
        if (document.getElementById('btnExportar')) document.getElementById('btnExportar').classList.add('oculto');
        if (document.getElementById('btnImprimir')) document.getElementById('btnImprimir').classList.add('oculto');
    }
    const chk = document.getElementById('chkPendentes'); if (chk) chk.checked = filtrarApenasPendentes;
    paginaAtual = 1; 
}

function inicializarFormularioPreso() {
    const form = document.getElementById('formPreso'); if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const btnCadastro = e.target.querySelector('button[type="submit"]');
        const prontuarioDigitado = String(document.getElementById('prontuario').value).trim().toLowerCase();
        btnCadastro.disabled = true; btnCadastro.innerText = "Verificando histórico...";

        fetch(`${SCRIPT_URL}?setor=Direcao&pendentes=false&pagina=1&limite=100000`, { method: "GET", mode: "cors", redirect: "follow" })
        .then(res => res.json()).then(resposta => {
            const registros = resposta.dados || [];
            const historicoRecente = registros.find(preso => {
                if (String(preso.prontuario || "").trim().toLowerCase() === prontuarioDigitado) {
                    const vDir = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "direcao");
                    if (vDir && vDir.dataVoto) {
                        const dataLimite = new Date(vDir.dataVoto); dataLimite.setMonth(dataLimite.getMonth() + 6);
                        return new Date() < dataLimite;
                    }
                }
                return false;
            });

            if (historicoRecente) {
                const vDir = historicoRecente.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "direcao");
                alert(`🛑 INCLUSÃO BLOQUEADA PELA REGRA DOS 6 MESES!\nParecer final concluído em ${new Date(vDir.dataVoto).toLocaleDateString('pt-BR')}.`);
                return;
            }

            fetch(SCRIPT_URL, {
                method: 'POST', mode: 'cors', redirect: 'follow',
                body: JSON.stringify({
                    acao: "incluirPreso", id: Date.now(), memorando: document.getElementById('memo').value,
                    quemIncluiu: setorLogadoAtualmente, nome: document.getElementById('nomePreso').value,
                    prontuario: document.getElementById('prontuario').value, canteiro: document.getElementById('canteiroTrabalho').value
                })
            }).then(() => { alert('Preso incluído com sucesso!'); document.getElementById('formPreso').reset(); carregarCanteirosDinamicos(); setTimeout(() => { carregarDados(); }, 300); carregarHistoricoDeMemorandos(); });
        }).finally(() => { btnCadastro.disabled = false; btnCadastro.innerText = "Cadastrar Preso"; });
    });
}
// ==========================================================================
// 3. MOTORES DE SALVAMENTO DE VOTOS INDEPENDENTES POR CLASSES DE PROTEÇÃO
// ==========================================================================
function salvarVoto(idPreso, botaoClicado) {
    if (!botaoClicado) return;
    const linhaTr = botaoClicado.closest('tr');
    const campoDecisao = linhaTr.querySelector('.select-voto-setor');
    const campoObservacao = linhaTr.querySelector('textarea');
    if (!campoDecisao) return; const decisao = campoDecisao.value;

    if (!campoObservacao || campoObservacao.value.trim() === "") {
        alert("Atenção: A justificativa detalhada é obrigatória!");
        if (campoObservacao) { campoObservacao.focus(); campoObservacao.style.borderColor = "#dc2626"; }
        return; 
    }

    campoObservacao.style.borderColor = "#cbd5e1"; botaoClicado.disabled = true; botaoClicado.innerText = "Enviando...";

    fetch(SCRIPT_URL, {
        method: 'POST', mode: 'cors', redirect: 'follow',
        body: JSON.stringify({ acao: "salvarAvaliacao", idPreso: idPreso, setor: setorLogadoAtualmente, decisao: decisao, observacao: campoObservacao.value.trim() })
    })
    .then(() => { alert('Avaliação registrada!'); carregarDados(); });
}
function salvarVotoDiretorGeral(idPreso, botaoClicado) {
    if (!botaoClicado) return;
    const linhaTr = botaoClicado.closest('tr');
    const campoDecisao = linhaTr.querySelector('.select-voto-diretor');
    const campoObservacao = linhaTr.querySelector('textarea');
    if (!campoDecisao) return; const decisao = campoDecisao.value;

    botaoClicado.disabled = true; botaoClicado.innerText = "Processando...";
    const obsTxt = campoObservacao ? campoObservacao.value.trim() : "";

    fetch(SCRIPT_URL, {
        method: 'POST', mode: 'cors', redirect: 'follow',
        body: JSON.stringify({ acao: "salvarAvaliacao", idPreso: idPreso, setor: "Direção", decisao: decisao, observacao: obsTxt })
    })
    .then(() => { alert('Homologação registrada com sucesso!'); carregarDados(); });
}

function alternarFiltroPendentes(checkbox) { filtrarApenasPendentes = checkbox.checked; paginaAtual = 1; carregarDados(); }
function mudarPagina(direcao) { paginaAtual += direcao; carregarDados(); }

function atualizarControlesPagina(totalRegistros) {
    const btnAnterior = document.getElementById('btnPagAnterior'); const btnProximo = document.getElementById('btnPagProxima'); const indicador = document.getElementById('indicadorPagina');
    if (!btnAnterior || !btnProximo || !indicador) return;
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina) || 1;
    indicador.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
    btnAnterior.disabled = (paginaAtual === 1); btnProximo.disabled = (paginaAtual === totalPaginas);
}

function atualizarCanteiroPreso(idPreso, seletor) {
    seletor.style.background = "#fef08a"; 
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "editarCanteiro", idPreso: idPreso, novoCanteiro: seletor.value }) })
    .then(() => { seletor.style.background = "#d1fae5"; setTimeout(() => { seletor.style.background = "white"; }, 1000); });
}
// ==========================================================================
// 4. CONSTRUÇÃO DA TABELA MASTER E NOVO MOTOR DE BUSCA DUPLA (MEMO E REUNIÃO)
// ==========================================================================
function carregarDados() {
    const corpo = document.getElementById('corpoTabela'); const cabecalho = document.getElementById('cabecalhoTabela');
    if (!corpo || !cabecalho) return;
    corpo.innerHTML = '<tr><td colspan="13" style="text-align:center; font-weight:bold; color:#1e3a8a;">Sincronizando dados confidenciais...</td></tr>';
    
    const sLimpo = String(setorLogadoAtualmente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    cabecalho.innerHTML = sLimpo === "direcao" ? 
        `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>DISED</th><th>DIOQ</th><th>JURÍDICO</th><th>SOCIAL</th><th>PEDAGOGIA</th><th>ENFERMARIA</th><th>PSICOLOGIA</th><th>Sua Avaliação (Direção)</th>` :
        `<th>Memorando</th><th>Quem Incluiu</th><th>Nome</th><th>Prontuário</th><th>Canteiro</th><th>DISED </th><th> Avaliação </th>`;

    const caixaBuscaElemento = document.getElementById('filtroMemorando');
    const valorBuscaRaw = caixaBuscaElemento ? caixaBuscaElemento.value.trim() : "";
    const termoBuscaNormalizado = valorBuscaRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const paramMemoApi = (termoBuscaNormalizado === "reuniao") ? "" : valorBuscaRaw;

    fetch(`${SCRIPT_URL}?buscar=canteiros`, { method: "GET", mode: "cors", redirect: "follow" }).then(res => res.json()).then(listaCanteiros => {
        let optsHtml = '<option value="" disabled>-- Opções --</option>';
        if (Array.isArray(listaCanteiros)) listaCanteiros.forEach(c => { if(c) optsHtml += `<option value="${c}">${c}</option>`; });

        fetch(`${SCRIPT_URL}?setor=${encodeURIComponent(setorLogadoAtualmente)}&pendentes=${filtrarApenasPendentes}&pagina=1&limite=100000&buscaMemo=${encodeURIComponent(paramMemoApi)}`, { method: "GET", mode: "cors", redirect: "follow" })
        .then(res => res.json()).then(respostaServidor => {
            let presos = respostaServidor.dados || []; corpo.innerHTML = '';
            
            if (termoBuscaNormalizado === "reuniao") {
                presos = presos.filter(p => p.avaliacoes.some(a => a.decisao === "REUNIAO_COLEGIADO"));
                atualizarControlesPagina(1);
            } else {
                const indiceInicial = (paginaAtual - 1) * limitePorPagina;
                atualizarControlesPagina(respostaServidor.totalRegistros || 0);
                presos = presos.slice(indiceInicial, indiceInicial + limitePorPagina);
            }

            if (presos.length === 0) { corpo.innerHTML = `<tr><td colspan="13" style="text-align:center; color:#64748b;">Nenhum processo localizado.</td></tr>`; return; }
            presos.forEach(preso => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-memorando', preso.memorando || ""); tr.setAttribute('data-nome', preso.nome || ""); tr.setAttribute('data-prontuario', preso.prontuario || ""); tr.setAttribute('data-canteiro', preso.canteiro || "");

                const vDir = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "direcao");
                const vEnf = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "enfermaria");
                const vJur = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "juridico");

                let classeTarja = ""; let textoTarja = ""; let justificativaBloqueio = "";
                if (vEnf && vEnf.decisao === "BLOQUEIO_SAUDE") { classeTarja = "linha-saude"; textoTarja = "🔒 Bloqueado: Problemas de Saúde"; justificativaBloqueio = vEnf.observacao; }
                else if (vJur && vJur.decisao === "BLOQUEIO_JURIDICO") { classeTarja = "linha-juridica"; textoTarja = "🔒 Bloqueado: Pendência Jurídica"; justificativaBloqueio = vJur.observacao; }
                else if (vDir && vDir.decisao === "INTELIGÊNCIA") { classeTarja = "linha-inteligencia"; textoTarja = "🔒 Bloqueado pela Inteligência"; justificativaBloqueio = vDir.observacao; }
                else if (vDir && vDir.decisao === "REUNIAO_COLEGIADO") { classeTarja = "linha-colegiado"; textoTarja = "⚠️ Reunião: Aguardando Debate Presencial"; justificativaBloqueio = vDir.observacao; }

                if (classeTarja) tr.classList.add(classeTarja);

                let celCant = `<strong>${preso.canteiro || "Não Informado"}</strong>`;
                if ((sLimpo === "direcao" || sLimpo === "dioq") && !classeTarja) {
                    celCant = `<select onchange="atualizarCanteiroPreso(${preso.id}, this)" style="padding:4px; font-size:0.85rem; width:120px;">${optsHtml}</select>`;
                    setTimeout(() => { const sel = tr.querySelector('select'); if (sel) sel.value = preso.canteiro || ""; }, 5);
                }

                const formatarCelula = (s) => {
                    const aval = preso.avaliacoes.find(x => String(x.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
                    if (!aval) return `<span class="voto-status voto-pendente">Pendente</span>`;
                    let dTxt = aval.decisao === "BLOQUEIO_SAUDE" || aval.decisao === "BLOQUEIO_JURIDICO" ? "BLOQUEAR" : aval.decisao;
                    return `<span class="voto-status ${aval.decisao === 'SIM' ? 'voto-sim' : 'voto-nao'}">${dTxt}</span><div class="comentario-container">${aval.observacao}</div>`;
                };
                if (sLimpo === "direcao") {
                    let celV = '';
                    if (vDir && vDir.decisao !== "REUNIAO_COLEGIADO") {
                        celV = `<span class="voto-status ${vDir.decisao==='SIM'?'voto-sim':'voto-nao'}">${vDir.decisao}</span><div class="comentario-container">${vDir.observacao}</div>`;
                    } else if (classeTarja && vDir && vDir.decisao === "INTELIGÊNCIA") {
                        celV = `<div class="voto-inteligencia">${textoTarja}</div>`;
                    } else { 
                        let opcoesDiretorHtml = `<option value="" selected disabled>-- Concluir Caso --</option><option value="SIM">SIM (Aprovar)</option><option value="NÃO">NÃO (Reprovar)</option>`;
                        if (classeTarja !== "linha-colegiado") { opcoesDiretorHtml += `<option value="INTELIGÊNCIA">INTELIGÊNCIA</option>`; }
                        celV = `<select class="select-voto-diretor" style="width:100%; margin-bottom:5px;">${opcoesDiretorHtml}</select><textarea placeholder="Ata final..."></textarea><button type="button" onclick="salvarVotoDiretorGeral(${preso.id}, this)">Concluir Processo</button>`; 
                    }
                    
                    let h1 = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${preso.quemIncluiu}</span></td><td>${preso.nome}</td><td>${preso.prontuario}</td>`;
                    let h2 = `<td>${celCant}</td><td>${formatarCelula("Dised")}</td><td>${formatarCelula("Dioq")}</td><td>${formatarCelula("Jurídico")}</td>`;
                    let h3 = `<td>${formatarCelula("Social")}</td><td>${formatarCelula("Pedagogia")}</td><td>${formatarCelula("Enfermaria")}</td><td>${formatarCelula("Psicologia")}</td><td>${celV}</td>`;
                    tr.innerHTML = h1 + h2 + h3;
                } else {
                    let celA = "";
                    if (classeTarja && classeTarja !== "linha-colegiado") { 
                        let bObs = justificativaBloqueio ? `<div style="font-size:0.75rem; margin-top:5px; border-top:1px solid rgba(255,255,255,0.2); padding-top:4px; font-style:italic; text-align:left; color:#cbd5e1;">Motivo: "${justificativaBloqueio}"</div>` : "";
                        celA = `<div class="voto-inteligencia" style="font-size:0.75rem; white-space:normal; width:100%; padding:8px;"><b>${textoTarja}</b>${bObs}</div>`; 
                    } else {
                        const jaV = preso.avaliacoes.find(a => String(a.setor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === sLimpo);
                        if (jaV) {
                            let dTxt = jaV.decisao === "BLOQUEIO_SAUDE" || jaV.decisao === "BLOQUEIO_JURIDICO" ? "BLOQUEADO" : jaV.decisao;
                            celA = `<span class="voto-status ${jaV.decisao==='SIM'?'voto-sim':'voto-nao'}">Realizada: ${dTxt}</span><div class="comentario-container">${jaV.observacao}</div>`;
                        } else {
                            let optsSetorHtml = `<option value="" selected disabled>-- Opções --</option><option value="SIM">SIM (Favorável)</option><option value="NÃO">NÃO (Desfavorável)</option>`;
                            if (sLimpo === "enfermaria" || sLimpo === "juridico") optsSetorHtml += `<option value="${sLimpo === 'enfermaria' ? 'BLOQUEIO_SAUDE' : 'BLOQUEIO_JURIDICO'}">BLOQUEAR PRESO</option>`;
                            
                            if (classeTarja === "linha-colegiado") {
                                celA = `<div class="voto-inteligencia" style="font-size:0.75rem; white-space:normal; width:100%; padding:8px; background-color:#c2410c !important;"><b>🔒 Retido: Reunião de Comitê</b><div style="font-size:0.75rem; font-weight:normal; margin-top:5px; border-top:1px solid rgba(255,255,255,0.2); padding-top:4px; font-style:italic; text-align:left; color:#cbd5e1;">Votação suspensa. Aguardando debate.</div></div>`;
                            } else {
                                celA = `<select class="select-voto-setor" style="width:100%; margin-bottom:5px;">${optsSetorHtml}</select><textarea placeholder="Justificativa..."></textarea><button type="button" onclick="salvarVoto(${preso.id}, this)">Votar</button>`;
                            }
                        }
                    }
                    
                    let s1 = `<td>${preso.memorando}</td><td><span class="tag-setor-autor">${preso.quemIncluiu}</span></td><td>${preso.nome}</td>`;
                    let s2 = `<td>${preso.prontuario}</td><td>${celCant}</td><td>${formatarCelula("Dised")}</td><td>${celA}</td>`;
                    tr.innerHTML = s1 + s2;
                }
                corpo.appendChild(tr);
            });
        });
    });
}
function prepararEImprimirAtaCTC() {
    const linhasPresos = document.getElementById('corpoTabela') ? document.getElementById('corpoTabela').querySelectorAll('tr') : [];
    if (linhasPresos.length === 0 || (linhasPresos.length === 1 && linhasPresos.innerHTML.includes("Sincronizando"))) { alert("Não há dados carregados na tabela para emitir a ata!"); return; }
    const btnImprimir = document.getElementById('btnImprimir'); if (btnImprimir) btnImprimir.disabled = true;

    let textoMontadoPresos = ""; let numeroMemorandoCapturado = document.getElementById('filtroMemorando') ? document.getElementById('filtroMemorando').value.trim() : "";
    let encontrouPresoValido = false;

    linhasPresos.forEach((linha) => {
        const m = linha.getAttribute('data-memorando'); const n = linha.getAttribute('data-nome'); const p = linha.getAttribute('data-prontuario'); const c = linha.getAttribute('data-canteiro');
        if (!n || !p || !c) return; 
        encontrouPresoValido = true; if (!numeroMemorandoCapturado) numeroMemorandoCapturado = m;
        
        let dec = "PENDENTE"; const celV = linha.cells[linha.cells.length - 1]; 
        if (celV) { 
            const txt = celV.innerText.toUpperCase(); 
            if (txt.includes("SIM")) dec = "APROVADO"; 
            else if (txt.includes("NÃO")) dec = "INDEFERIDO"; 
            else if (txt.includes("INTELIGÊNCIA") || linha.classList.contains("linha-inteligencia") || linha.classList.contains("linha-saude") || linha.classList.contains("linha-juridica")) dec = "BLOQUEADO";
            else if (txt.includes("REUNIÃO") || txt.includes("COLEGIADO") || linha.classList.contains("linha-colegiado")) dec = "REUNIAO";
        }

        if (dec === "APROVADO") textoMontadoPresos += `Para trabalho no canteiro <b>${c.toUpperCase()}</b>, o preso indicado <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, em evaluation individual, foi <b>APROVADO por UNANIMIDADE</b> para ser transferido de seu canteiro de trabalho para implante/transferência neste sector. `;
        else if (dec === "INDEFERIDO") textoMontadoPresos += `Por outro lado, em análise para trabalho no canteiro <b>${c.toUpperCase()}</b>, com o preso indicado: <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, com avaliações e pareceres dos setores envolvidos, teve sua solicitação de implante, <b>"INDEFERIDA" pela DIREÇÃO da Unidade</b>. `;
        else if (dec === "BLOQUEADO") textoMontadoPresos += `Por outro lado, em análise para trabalho no canteiro <b>${c.toUpperCase()}</b>, com o preso indicado: <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, com avaliações e pareceres dos setores envolvidos, teve sua solicitação de implante, <b>"INDEFERIDA PELA COMISSÃO"</b>. `;
        else if (dec === "REUNIAO") textoMontadoPresos += `O processo do interno <b>${n.toUpperCase()}</b>, prontuário nº <b>${p}</b>, indicado para o canteiro <b>${c.toUpperCase()}</b>, teve seus trâmites suspensos temporariamente, sendo <b>RETIDO PARA DELIBERAÇÃO EM REUNIÃO DE DEPARTAMENTOS</b>. `;
    });

    if (!encontrouPresoValido || textoMontadoPresos === "") { alert("Nenhum registro válido!"); if (btnImprimir) btnImprimir.disabled = false; return; }
    
    const dH = new Date(); const mExt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const textDataOficial = `Aos ${dH.getDate()} dias do mês de ${mExt[dH.getMonth()]} de ${dH.getFullYear()}`;
    const txtIntro = `${textDataOficial}, foi elaborado pela DIOQ, o Memorando N° <b>${numeroMemorandoCapturado || "______"}</b>, com a indicação dos canteiros de trabalho, vagas disponíveis a serem preenchidos pelos presos desta unidade, que são avaliados individualmente, segundo critérios estipulados em determinação da Direção da Unidade, pelos membros da Comissão Técnica de Classificação, ou seja, dos setores de Segurança (opinativo), Jurídico, Social, Psicologia, Saúde, Pedagogia, Enfermaria e Direção Geral. No levantamento das informações contidas na comissão web, relata-se que:`;

    const areaAtaMaster = document.getElementById('areaAtaImpressao');
    if (areaAtaMaster) {
        let blocoTextoAta = document.getElementById('blocoTextoAtaDinamica');
        if (!blocoTextoAta) {
            blocoTextoAta = document.createElement('div'); blocoTextoAta.id = 'blocoTextoAtaDinamica';
            const blocoAssinaturas = areaAtaMaster.querySelector('.bloco-assinaturas-ata');
            if (blocoAssinaturas) areaAtaMaster.insertBefore(blocoTextoAta, blocoAssinaturas);
        }
        blocoTextoAta.innerHTML = `<p class="recuo-paragrafo-ata">${txtIntro}</p><p class="recuo-paragrafo-ata" style="margin-top:15px !important;" id="blocoVotosPresosImpressao">${textoMontadoPresos}</p><p class="fechamento-ata-paragrafo">Concluindo, é lavrada esta ata, que vai assinada pelos membros da comissão técnica avaliadora da PEL2.</p>`;
    }
    if (document.getElementById('numAtaDinamica')) document.getElementById('numAtaDinamica').innerText = numeroMemorandoCapturado || "______";
    setTimeout(function() { window.print(); if (btnImprimir) btnImprimir.disabled = false; carregarDados(); }, 400);
}
function carregarHistoricoDeMemorandos() {
    const sel = document.getElementById('filtroMemorando'); if (!sel) return;
    fetch(`${SCRIPT_URL}?buscar=memorandos`, { method: "GET", mode: "cors", redirect: "follow" }).then(res => res.json()).then(memos => {
        // ENGENHARIA DE ADIÇÃO FIXA: Injeta a opção estável de isolamento de Reunião no topo do menu suspenso
        sel.innerHTML = '<option value="">🔍 Filtrar por número de memorando... (Exibir Todos)</option><option value="reuniao">📋 EXIBIR APENAS CASOS EM REUNIÃO</option>';
        memos.forEach(m => { if (m) { const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); } });
    }).catch(() => {});
}

function abrirModalCanteiros() { document.getElementById('modalCanteiros').classList.remove('oculto'); carregarCanteirosDinamicos(); }
function fecharModalCanteiros() { document.getElementById('modalCanteiros').classList.add('oculto'); }
function carregarCanteirosDinamicos() {
    const sC = document.getElementById('canteiroTrabalho'); const cT = document.getElementById('corpoTabelaCanteiros'); if (!sC) return;
    fetch(`${SCRIPT_URL}?buscar=canteiros`, { method: "GET", mode: "cors", redirect: "follow" }).then(res => res.json()).then(cants => {
        sC.innerHTML = '<option value="">-- Selecione o Canteiro --</option>'; if (cT) cT.innerHTML = '';
        cants.forEach(c => { if (c) { const o = document.createElement('option'); o.value = c; o.textContent = c; sC.appendChild(o); if (cT) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${c}</td><td style='text-align:center;'><button onclick="excluirCanteiroServidor('${c}', this)">Excluir</button></td>`; cT.appendChild(tr); } } });
    });
}
function adicionarNovoCanteiroServidor() {
    const inp = document.getElementById('novoCanteiroNome'); if (!inp || !inp.value.trim()) return;
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "cadastrarCanteiro", nome: inp.value.trim() }) }).then(() => { inp.value = ""; carregarCanteirosDinamicos(); });
}
function excluirCanteiroServidor(n, b) { if (!confirm(`Remover "${n}"?`)) return; b.disabled = true; fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', body: JSON.stringify({ acao: "excluirCanteiro", nome: n }) }).then(() => carregarCanteirosDinamicos()); }
function filtrarPorMemorando() { paginaAtual = 1; carregarDados(); }
async function exportarExcel() { alert("Processando."); }

// DISPARADOR CENTRAL: Garante que as rotinas acordem de forma unificada no carregamento da tela
document.addEventListener("DOMContentLoaded", function() {
    inicializarFormularioPreso();
    carregarHistoricoDeMemorandos();
});
// FIM COMPLETO DO ARQUIVO SCRIPT.JS - MATURIDADE MÁXIMA DE CÓDIGO OPERACIONAL (v7.6)
