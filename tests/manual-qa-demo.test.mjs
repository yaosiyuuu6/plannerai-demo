import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../demo/agent-workbench.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = html.match(new RegExp(`function ${name}([\\s\\S]*?)\\n    }`));
  assert.ok(match, `${name} should be defined`);
  return Function(`return function ${name}${match[1]}\n    }`)();
}

test('manual Q&A is exposed as a hidden artifact tab', () => {
  assert.match(
    html,
    /<div class="tab" data-tab="manualQa" style="display:none" role="tab" tabindex="-1" aria-selected="false"><span>问<\/span><span>创建问题<\/span><button class="tab-close" aria-label="关闭创建问题">×<\/button><\/div>/
  );
  assert.match(html, /manualQa:\s*\{\s*open:\s*false,\s*available:\s*false,\s*title:\s*'创建问题'/);
});

test('manual Q&A snapshots a complete draft and opens from a prefill source', () => {
  assert.match(html, /function snapshotManualQaPrefill\(prefill\)/);
  assert.match(html, /Object\.freeze\(\{[\s\S]*?title:[\s\S]*?team:[\s\S]*?business:[\s\S]*?issueType:\s*'常规'[\s\S]*?reporter:[\s\S]*?handler:[\s\S]*?category:[\s\S]*?market:[\s\S]*?tables:[\s\S]*?ruleDocs:[\s\S]*?cc:[\s\S]*?description:[\s\S]*?\.\.\.prefill/);
  assert.match(html, /let manualQaPrefill\s*=\s*null/);
  assert.match(html, /let manualQaDraft\s*=\s*null/);
  assert.match(html, /let manualQaView\s*=\s*'form'/);
  assert.match(html, /function openManualQa\(source\)/);
  assert.match(html, /manualQaDraft\s*=\s*snapshotManualQaPrefill\(manualQaPrefill\)/);
  assert.match(html, /tabs\.manualQa\.open\s*=\s*true/);
  assert.match(html, /activeTab\s*=\s*'manualQa'/);
});

test('manual Q&A snapshot applies defaults, merges prefill, and is frozen', () => {
  const snapshotManualQaPrefill = extractFunction('snapshotManualQaPrefill');
  const draft = snapshotManualQaPrefill({ title: '已预填', issueType: '紧急' });

  assert.deepEqual(draft, {
    title: '已预填',
    team: '',
    business: '',
    issueType: '紧急',
    reporter: '',
    handler: '',
    category: '',
    market: '',
    tables: '',
    ruleDocs: '',
    cc: '',
    description: ''
  });
  assert.equal(Object.isFrozen(draft), true);
});

test('reopening the manual Q&A form preserves the existing draft', () => {
  assert.match(html, /if \(manualQaDraft && manualQaView === 'form'\)/);
  assert.match(
    html,
    /if \(manualQaDraft && manualQaView === 'form'\) \{[\s\S]*?tabs\.manualQa\.open = true;[\s\S]*?activeTab = 'manualQa';[\s\S]*?setArtifactVisible\(true, true\);[\s\S]*?renderArtifact\(\);[\s\S]*?return;/
  );
});

test('reopen button ignores manual Q&A until it has been created', () => {
  assert.match(html, /tabs\.manualQa\.available\s*=\s*true/);
  assert.match(html, /find\(key => !tabs\[key\]\.open && tabs\[key\]\.available !== false\)/);
});

test('artifact tabs synchronize their label and accessibility state', () => {
  assert.match(html, /tab\.querySelector\('[^']*'\)\.textContent\s*=\s*tabs\[key\]\.title/);
  assert.match(html, /tab\.setAttribute\('aria-selected', String\(isActive\)\)/);
  assert.match(html, /tab\.tabIndex\s*=\s*isActive \? 0 : -1/);
});

test('artifact renderer routes each tab through its own renderer', () => {
  assert.match(
    html,
    /const artifactRenderers\s*=\s*\{\s*report:\s*reportHtml,\s*table:\s*tableHtml,\s*manualQa:\s*manualQaHtml\s*\}/
  );
  assert.match(html, /artifactBody\.innerHTML\s*=\s*artifactRenderers\[activeTab\]\(\)/);
  assert.match(html, /function manualQaHtml\(\)/);
  assert.match(html, /manualQaView === 'detail' \? manualQaDetailHtml\(\) : manualQaFormHtml\(\)/);
});

test('manual Q&A form exposes all twelve visible fields and demo controls', () => {
  assert.match(html, /<form class="manual-qa-form" id="manualQaForm"/);
  const fields = {
    title: '标题',
    team: '团队',
    business: '业务',
    issueType: '问题类型',
    reporter: '报告人',
    handler: '经办人',
    category: '品种',
    market: '市场',
    tables: '涉及表',
    ruleDocs: '规则文档',
    cc: '抄送',
    description: '描述'
  };
  for (const [name, label] of Object.entries(fields)) {
    assert.match(html, new RegExp(`<label[^>]*for="manualQa-${name}"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/label>`));
    assert.match(html, new RegExp(`(?:input|select|textarea)[^>]*id="manualQa-${name}"[^>]*name="${name}"`));
  }
  assert.match(html, /name="title"[^>]*maxlength="60"/);
  assert.match(html, /<option value="常规"/);
  assert.match(html, /<option value="涉及质检"/);
  assert.match(html, /<label for="manualQa-issueType"><span class="manual-required" aria-hidden="true">\*<\/span>问题类型<\/label>/);
  assert.match(html, /name="demoFailure"/);
  assert.match(html, /Demo：模拟一次提交失败/);
  assert.match(html, /class="manual-form-error"[^>]*role="alert"/);
  assert.match(html, />取消<\/button>/);
  assert.match(html, />确认<\/button>/);
});

test('manual Q&A required controls expose native accessibility semantics', () => {
  for (const name of [
    'title', 'team', 'business', 'issueType', 'reporter', 'handler',
    'category', 'market', 'tables', 'ruleDocs', 'cc', 'description'
  ]) {
    assert.match(html, new RegExp(`(?:input|select|textarea)[^>]*name="${name}"[^>]*required`));
  }
  assert.match(html, /missing\[0\][\s\S]*?aria-invalid[\s\S]*?focus\(\)/);
});

test('manual Q&A form follows the production row grouping baseline', () => {
  assert.match(html, /manual-form-grid[\s\S]*?manualQa-title[\s\S]*?manualQa-team[\s\S]*?manualQa-business[\s\S]*?manualQa-issueType[\s\S]*?manualQa-reporter[\s\S]*?manualQa-handler[\s\S]*?manualQa-category[\s\S]*?manualQa-market[\s\S]*?manualQa-tables[\s\S]*?manualQa-ruleDocs[\s\S]*?manualQa-cc[\s\S]*?manualQa-description/);
  for (const name of ['team', 'business', 'issueType']) {
    assert.match(html, new RegExp(`class="manual-field third"[\\s\\S]*?manualQa-${name}`));
  }
  assert.match(html, /\.manual-form-grid[\s\S]*?grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(html, /\.manual-field\.third\s*\{\s*grid-column:\s*span 2/);
  assert.match(html, /\.manual-field\.wide\s*\{\s*grid-column:\s*1 \/ -1/);
});

test('manual Q&A validation requires issue type and accepts the standard default value', () => {
  const validateManualQaDraft = extractFunction('validateManualQaDraft');
  const missing = validateManualQaDraft({});

  assert.deepEqual(missing, [
    'title', 'team', 'business', 'issueType', 'reporter', 'handler', 'category',
    'market', 'tables', 'ruleDocs', 'cc', 'description'
  ]);
  assert.deepEqual(validateManualQaDraft({
    title: '问题',
    team: '团队',
    business: '业务',
    issueType: '常规',
    reporter: '报告人',
    handler: '经办人',
    category: '股票',
    market: '中国大陆',
    tables: 'LR1105',
    ruleDocs: '录入规则',
    cc: '业务组',
    description: '请确认规则'
  }), []);
});

test('manual Q&A submit keeps values on demo failure and switches to fixed detail on success', () => {
  assert.match(html, /function formDraft\(form\)[\s\S]*?new FormData\(form\)/);
  assert.match(html, /function submitManualQa\(form\)/);
  assert.match(html, /manualQaDraft\s*=\s*submittedDraft/);
  assert.match(html, /validateManualQaDraft\(manualQaDraft\)/);
  assert.match(html, /提交失败，已保留全部填写内容/);
  assert.match(html, /submitButton\.disabled\s*=\s*true/);
  assert.match(html, /submitButton\.textContent\s*=\s*'提交中…'/);
  assert.match(html, /setTimeout\([\s\S]*?500\)/);
  assert.match(html, /manualQaView\s*=\s*'detail'/);
  assert.match(html, /tabs\.manualQa\.title\s*=\s*'ADTD-3179｜国财A股组规则确认'/);
  assert.match(html, /tabs\.manualQa\.meta\s*=\s*'待处理 · 人工问答详情'/);
});

test('manual Q&A field updates preserve the rest of an unsaved draft across rerenders', () => {
  const updateManualQaDraftField = extractFunction('updateManualQaDraftField');
  const initial = { title: '原始标题', business: '原业务', demoFailure: false };
  const afterTitleInput = updateManualQaDraftField(initial, 'title', '尚未提交的新标题');
  const afterCheckboxChange = updateManualQaDraftField(afterTitleInput, 'demoFailure', true);

  assert.deepEqual(afterCheckboxChange, {
    title: '尚未提交的新标题',
    business: '原业务',
    demoFailure: true
  });
  assert.deepEqual(initial, { title: '原始标题', business: '原业务', demoFailure: false });
  assert.match(html, /artifactBody\.addEventListener\('input',[\s\S]*?syncManualQaDraftControl/);
  assert.match(html, /artifactBody\.addEventListener\('change',[\s\S]*?syncManualQaDraftControl/);
});

test('manual Q&A submit completion rejects reset and cancel races', () => {
  const canCompleteManualQaSubmit = extractFunction('canCompleteManualQaSubmit');
  const pendingToken = 7;

  assert.equal(canCompleteManualQaSubmit(pendingToken, pendingToken, 'form', true), true);
  assert.equal(canCompleteManualQaSubmit(pendingToken, pendingToken + 1, 'form', true), false, 'reset invalidates the token');
  assert.equal(canCompleteManualQaSubmit(pendingToken, pendingToken, 'form', false), false, 'cancel closes the draft');
  assert.match(html, /const submittedDraft\s*=\s*formDraft\(form\)/);
  assert.match(html, /const submitToken\s*=\s*\+\+manualQaSubmitToken/);
  assert.match(html, /canCompleteManualQaSubmit\(submitToken, manualQaSubmitToken, manualQaView, tabs\.manualQa\.open\)/);
  assert.match(html, /if \(submittedDraft\.demoFailure\)/);
  assert.match(html, /function resetManualQaDraft\(\)[\s\S]*?invalidateManualQaSubmit\(\)/);
  assert.match(html, /data\.manualFormAction !== 'cancel'[\s\S]*?invalidateManualQaSubmit\(\)[\s\S]*?tabs\.manualQa\.open = false/);
});

test('manual Q&A detail embeds the fixed pending issue and two deferred actions', () => {
  assert.match(html, /function manualQaDetailHtml\(\)/);
  assert.match(html, /<section class="manual-detail" aria-label="人工问答详情嵌入视图">/);
  assert.match(html, /ADTD-3179/);
  assert.match(html, /manual-status-pill[^>]*>待处理/);
  assert.match(html, /国财A股组规则确认/);
  for (const text of ['问题描述', '暂无附件', '暂无回复', '团队', '业务', '市场', '品种', '涉及表', '规则文档']) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /data-add-reply[^>]*>添加回复<\/button>/);
  assert.match(html, /data-add-to-agent[^>]*>添加至 Agent<\/button>/);
  const detailSource = html.match(/function manualQaDetailHtml\(\)([\s\S]*?)\n    function reportHtml\(\)/)?.[1] || '';
  assert.doesNotMatch(detailSource, /type="checkbox"|aiAssistToggle|开启 AI 问答辅助/);
  assert.match(detailSource, /<div class="manual-detail-section manual-detail-reply">[\s\S]*?<h3>回复<\/h3>[\s\S]*?<div class="manual-detail-actions">[\s\S]*?data-add-reply[\s\S]*?data-add-to-agent[\s\S]*?<\/div>\s*<\/div>/);
});

test('manual Q&A rerender-safe delegation submits and cancels the embedded form', () => {
  assert.match(html, /artifactBody\.addEventListener\('submit'/);
  assert.match(html, /event\.target\.matches\('#manualQaForm'\)/);
  assert.match(html, /submitManualQa\(event\.target\)/);
  assert.match(html, /artifactBody\.addEventListener\('click'/);
  assert.match(html, /data-manual-form-action/);
  assert.match(html, /tabs\.manualQa\.open\s*=\s*false/);
  assert.match(html, /find\(key => tabs\[key\]\.open\)/);
});

test('manual Q&A form and detail use responsive Ant-light layout classes', () => {
  for (const className of [
    'manual-qa-form', 'manual-form-grid', 'manual-field', 'manual-form-error',
    'manual-form-footer', 'manual-demo-failure', 'manual-detail',
    'manual-detail-grid', 'manual-detail-actions', 'manual-status-pill'
  ]) {
    assert.match(html, new RegExp(`\\.${className}(?:[\\s,{.:#>]|$)`));
  }
  assert.match(html, /\.artifact-body\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(html, /\.artifact-body\s*\{[\s\S]*?container-type:\s*inline-size/);
  assert.match(html, /@container\s+artifact-body\s*\(max-width:\s*\d+px\)[\s\S]*?\.manual-form-grid[\s\S]*?grid-template-columns:\s*1fr/);
});

test('unanswerable conversation asks for confirmation without explicit manual Q&A actions', () => {
  assert.match(html, /<section class="manual-qa-story" id="manualQaStory" hidden>/);
  assert.match(html, /请确认 LR1105 非经常性损益内部表加工规则。/);
  assert.match(html, /当前资料不足以支持确定结论/);
  assert.match(html, /后台预填不影响当前回答：已提前识别团队、业务、品种、市场、涉及表和规则文档。/);
  assert.match(html, /已有规则[\s\S]*?金额不等于一级科目[\s\S]*?无法推断/);
  assert.match(html, /发现相似的处理中问题/);
  assert.match(html, /待处理/);
  assert.match(html, /ADTD-3178/);
  assert.match(html, /国财A股组规则确认/);
  const storySource = html.match(/<section class="manual-qa-story"[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(storySource, /data-manual-qa-action=/);
  assert.doesNotMatch(storySource, /打开已有问题|订阅进展|仍然创建新问题/);
  assert.match(html, /需要帮你开启人工问答吗？/);
});

test('proactive manual Q&A prefill is complete and frozen', () => {
  assert.match(html, /function prepareManualQaPrefill\(\)/);
  assert.match(html, /manualQaPrefill\s*=\s*Object\.freeze\(\{/);
  const fields = {
    title: '国财A股组规则确认：LR1105 非经常性损益内部表加工规则',
    team: '财务分部-财务组-A股',
    business: '非经常性损益明细-A股',
    issueType: '常规',
    reporter: 'yaochenkai@myhexin.com',
    handler: 'tangyahui@myhexin.com',
    category: '股票',
    market: '中国 > 中国大陆',
    tables: 'LR1105、STK1196',
    ruleDocs: 'STK1196/LR1105 非经常性损益录入规则',
    cc: '非经常性损益明细-A股',
    description: '请确认金额不等于一级科目时，一级科目编码和其中项编码的加工规则。'
  };
  for (const [key, value] of Object.entries(fields)) {
    assert.ok(html.includes(key + ": '" + value + "'"), 'missing prefill field: ' + key);
  }
  assert.match(html, /后台预填不影响当前回答/);
});

test('manual Q&A confirmation recognizes only obvious standalone confirmations', () => {
  const isManualQaConfirmation = extractFunction('isManualQaConfirmation');
  for (const text of ['需要', '好的', '好', '可以', '帮我创建', '开启人工问答', '  可以！ ']) {
    assert.equal(isManualQaConfirmation(text), true, text);
  }
  for (const text of ['', '不需要', '可以说说原因吗', '帮我创建报告']) {
    assert.equal(isManualQaConfirmation(text), false, text);
  }
});

test('manual Q&A composer shortcut reuses the pending-session prefill', () => {
  assert.match(html, /const messages\s*=\s*document\.getElementById\('messages'\)/);
  assert.match(html, /const sendBtn\s*=\s*document\.getElementById\('sendBtn'\)/);
  assert.match(html, /<button class="human-btn" id="manualQaBtn" type="button" aria-label="创建人工问答">/);
  assert.match(html, /id="plusBtn"[\s\S]*?id="manualQaBtn"[\s\S]*?class="model-switch"/);
  assert.match(html, /const manualQaBtn\s*=\s*document\.getElementById\('manualQaBtn'\)/);
  assert.match(html, /manualQaBtn\.addEventListener\('click', \(\) => \{[\s\S]*?if \(manualQaPromptPending\) \{[\s\S]*?prepareManualQaPrefill\(\);[\s\S]*?\} else \{[\s\S]*?manualQaPrefill\s*=\s*snapshotManualQaPrefill\(\{\s*description: composerInput\.textContent\.trim\(\)\s*\}\);[\s\S]*?\}[\s\S]*?openManualQa\('composer'\);[\s\S]*?\}\);/);
  assert.match(html, /if \(manualQaPromptPending && isManualQaConfirmation\(text\)\) \{[\s\S]*?openManualQa\('model'\);[\s\S]*?return;/);
});

test('manual Q&A story has a dedicated history state and isolated conversation lifecycle', () => {
  assert.match(html, /<div class="history-row" data-history-state="manual-qa"[^>]*>国财A股组规则确认<\/div>/);
  assert.match(html, /function loadManualQaConversation\(\)/);
  assert.match(html, /state === 'manual-qa'[\s\S]*?loadManualQaConversation\(\)/);
  assert.match(html, /function clearManualQaStory\(\)/);
  assert.match(html, /function resetManualQaDraft\(\)/);
  assert.match(html, /#messages\.manual-qa-mode > :not\(#manualQaStory\)\s*\{\s*display:\s*none/);
  assert.match(html, /let manualQaPromptPending\s*=\s*false/);
  assert.match(html, /function loadManualQaConversation\(\)[\s\S]*?prepareManualQaPrefill\(\)[\s\S]*?manualQaPromptPending\s*=\s*true[\s\S]*?messages\.classList\.add\('manual-qa-mode'\)/);
  assert.match(html, /function loadEmptyConversation\(\) \{[\s\S]*?resetConversationModes\(clearManualQaStory, clearPlanningStory, resetManualQaDraft\);[\s\S]*?tabs\.report\.open = false;[\s\S]*?tabs\.table\.open = false;/);
  assert.match(html, /function loadArtifactConversation\(\) \{[\s\S]*?resetConversationModes\(clearManualQaStory, clearPlanningStory, resetManualQaDraft\);[\s\S]*?tabs\.report\.open = true;[\s\S]*?tabs\.table\.open = true;/);
  assert.match(html, /function loadManualQaConversation\(\) \{[\s\S]*?tabs\.report\.open = false;[\s\S]*?tabs\.table\.open = false;/);
  assert.match(html, /function resetManualQaDraft\(\) \{[\s\S]*?createManualQaConversationState\(\)[\s\S]*?manualQaPrefill = state\.prefill;[\s\S]*?manualQaDraft = state\.draft;[\s\S]*?tabs\.manualQa\.open = state\.open;[\s\S]*?tabs\.manualQa\.available = state\.available;/);
});

test('opening a manual Q&A draft preserves its conversation title without changing other modes', () => {
  const resolveConversationTitle = extractFunction('resolveConversationTitle');

  assert.equal(
    resolveConversationTitle(true, '国财A股组规则确认', true),
    '国财A股组规则确认'
  );
  assert.equal(
    resolveConversationTitle(true, '国财A股组规则确认', false),
    '港股股权激励处理方案'
  );
  assert.equal(resolveConversationTitle(false, '任意会话', true), '新问答');
  assert.match(
    html,
    /function openManualQa\(source\) \{[\s\S]*?setArtifactVisible\(true, true\);[\s\S]*?setArtifactVisible\(true, true\);/
  );
});

test('entering manual Q&A history starts from isolated draft state before proactive prefill', () => {
  const createManualQaConversationState = extractFunction('createManualQaConversationState');
  const state = createManualQaConversationState();

  assert.deepEqual(state, {
    prefill: null,
    draft: null,
    view: 'form',
    promptPending: false,
    open: false,
    available: false,
    title: '创建问题',
    meta: '人工问答 · 未提交'
  });
  assert.equal(Object.isFrozen(state), true);
  assert.match(
    html,
    /function loadManualQaConversation\(\) \{[\s\S]*?resetConversationModes\(clearManualQaStory, clearPlanningStory, resetManualQaDraft\);[\s\S]*?prepareManualQaPrefill\(\);/
  );
});

test('pending manual Q&A sends use fixed story-safe actions instead of artifact generation', () => {
  const resolveManualQaSendAction = extractFunction('resolveManualQaSendAction');

  assert.equal(resolveManualQaSendAction(true, true), 'open-manual-qa');
  assert.equal(resolveManualQaSendAction(true, false), 'story-explanation');
  assert.equal(resolveManualQaSendAction(false, false), 'generate-artifact');
  assert.match(
    html,
    /if \(sendAction === 'story-explanation'\) \{[\s\S]*?setArtifactVisible\(false\);[\s\S]*?conversationTitle\.textContent = '国财A股组规则确认';[\s\S]*?showToast\('[^']+'\);[\s\S]*?return;/
  );
});

test('manual Q&A history entry supports keyboard activation', () => {
  assert.match(
    html,
    /<div class="history-row" data-history-state="manual-qa" role="button" tabindex="0">国财A股组规则确认<\/div>/
  );
  assert.match(html, /manualQaHistoryRow\.addEventListener\('keydown',[\s\S]*?\['Enter', ' '\]\.includes\(event\.key\)[\s\S]*?manualQaHistoryRow\.click\(\)/);
});

test('entry detail shows disabled reply and Agent actions because entry role lacks permission', () => {
  assert.doesNotMatch(html, /aiAssistToggle|开启 AI 问答辅助/);
  const detailSource = html.match(/function manualQaDetailHtml\(\)([\s\S]*?)\n\s*function reportHtml/)?.[1] || '';
  assert.match(detailSource, /data-add-reply disabled aria-disabled="true"/);
  assert.match(detailSource, /data-add-to-agent disabled aria-disabled="true"/);
  assert.match(detailSource, /当前角色无回复权限/);
});

test('far-left manual Q&A nav opens a simulated existing manual Q&A module', () => {
  assert.match(html, /<button class="nav-item active" type="button" data-app-view="agent" aria-current="page">AI问答<\/button>/);
  assert.match(html, /<button class="nav-item" type="button" data-app-view="manual-qa">人工问答<\/button>/);
  assert.match(html, /<section class="manual-system" id="manualSystem"[^>]*>/);
  assert.match(html, /id="manualIssueList"/);
  assert.match(html, /ADTD-3194/);
  assert.match(html, /ADTD-3191/);
  assert.doesNotMatch(html, /ADTD-3193/);
  assert.match(html, /质检组规则确认：国籍为中国，股东性质披露为境外自然人/);
  assert.match(html, /<aside class="business-module" aria-label="AI问答模块">/);
  assert.match(html, /data-manual-module-add-reply[^>]*>添加回复<\/button>/);
  assert.match(html, /data-manual-module-add-agent[^>]*>添加至 Agent<\/button>/);
  assert.match(html, /function setApplicationView\(view\)/);
  assert.match(html, /layout\.classList\.toggle\('manual-system-mode', view === 'manual-qa'\)/);
  assert.match(html, /\.layout\.manual-system-mode \{ grid-template-columns: var\(--platform-width\) var\(--module-width\) minmax\(0, 1fr\); \}/);
  assert.match(html, /\.manual-system \{[\s\S]*?grid-column:\s*3 \/ -1/);
  assert.doesNotMatch(html, /\.layout\.manual-system-mode > \.business-module,/);
  assert.match(html, /if \(item\.dataset\.appView === view\) item\.setAttribute\('aria-current', 'page'\);/);
  assert.match(html, /else item\.removeAttribute\('aria-current'\);/);
});

test('manual Q&A module remains reachable on narrow viewports', () => {
  assert.match(html, /@media \(max-width:\s*900px\)[\s\S]*?\.manual-system\s*\{[\s\S]*?grid-template-columns:\s*220px minmax\(0, 1fr\)[\s\S]*?\.manual-system-properties\s*\{[\s\S]*?display:\s*none/);
  assert.match(html, /@media \(max-width:\s*640px\)[\s\S]*?\.manual-system\s*\{[\s\S]*?grid-template-columns:\s*1fr[\s\S]*?grid-template-rows:[\s\S]*?\.manual-issue-list\s*\{[\s\S]*?display:\s*flex[\s\S]*?overflow-x:\s*auto/);
  assert.match(html, /@media \(max-width:\s*640px\)[\s\S]*?\.manual-system-detail\s*\{[\s\S]*?overflow-y:\s*auto/);
});

test('manual issue selection uses fixed data and never leaves a dead row', () => {
  const selectManualIssue = extractFunction('selectManualIssue');
  const issues = [{ id: 'A' }, { id: 'B' }];
  assert.equal(selectManualIssue(issues, 'A', 'B'), 'B');
  assert.equal(selectManualIssue(issues, 'A', 'missing'), 'A');
  assert.match(html, /data-manual-issue-id="\$\{issue\.id\}"/);
  assert.match(html, /function renderManualIssueList\(\)/);
  assert.match(html, /function renderManualIssueDetail\(\)/);
  assert.match(html, /selectedManualIssueId = selectManualIssue\(manualIssues, selectedManualIssueId, issueCard\.dataset\.manualIssueId\)/);
  assert.match(html, /renderManualIssueList\(\);[\s\S]*?renderManualIssueDetail\(\)/);
});

test('manual Q&A module buttons are enabled, left aligned, and route independently', () => {
  assert.match(html, /\.manual-system-actions\s*\{[\s\S]*?justify-content:\s*flex-start/);
  assert.match(
    html,
    /manualSystem\.addEventListener\('click',[\s\S]*?data-manual-module-add-reply[\s\S]*?directReplyEditorHtml\(\)[\s\S]*?data-manual-module-add-agent[\s\S]*?handoffManualQaToAgent\(\)/
  );
});

test('formal reply submits in the manual module and uses same-page Agent wording', () => {
  assert.doesNotMatch(html, /新打开的 Agent 页面/);
  assert.match(html, /placeholder="输入正式回复，也可返回 Agent 通过 @人工问答 获取辅助"/);
  assert.match(html, /function submittedReplyHtml\(reply\)/);
  assert.match(html, /data-submit-formal-reply[\s\S]*?formalReplyInput[\s\S]*?submittedReplyHtml\(reply\)/);
  assert.match(html, /回复已提交/);
});

test('planning suggestion entry appears only in the submitted formal reply state', () => {
  const editor = html.match(/function directReplyEditorHtml\(\)([\s\S]*?)\n\s*function submittedReplyHtml/)?.[1] || '';
  const submitted = html.match(/function submittedReplyHtml\(reply\)([\s\S]*?)\n\s*function/)?.[1] || '';
  assert.doesNotMatch(editor, /生成规划文档修改建议/);
  assert.match(submitted, /data-generate-planning-suggestion[^>]*>生成规划文档修改建议<\/button>/);
});

test('planning suggestion opens a clean launch URL in a new Agent tab', () => {
  assert.match(html, /function planningLaunchUrl\(href, contextKey\)/);
  assert.match(html, /searchParams\.set\('launch',\s*'planning'\)/);
  assert.match(html, /searchParams\.set\('contextKey',\s*contextKey\)/);
  assert.match(html, /function openPlanningSuggestionAgent\(issue, reply\)/);
  assert.match(html, /localStorage/);
  assert.doesNotMatch(html, /sessionStorage\.setItem\('planningSuggestionContext'/);
  const launch = html.match(/function openPlanningSuggestionAgent\(issue, reply\)([\s\S]*?)\n\s*function/)?.[1] || '';
  assert.doesNotMatch(launch, /searchParams\.(?:set|append)\([^)]*(?:reply|description|prompt|body)/i);
  assert.doesNotMatch(launch, /sendBtn\.click/);
  assert.match(launch, /showToast/);
  assert.match(launch, /弹窗|打开/);
});

test('planning launch drafts the evaluation prompt without sending it', () => {
  assert.match(html, /function planningPromptForContext\(context\)/);
  assert.match(html, /function initializePlanningLaunch\(\)/);
  assert.match(html, /const params\s*=\s*new URLSearchParams\(window\.location\.search\)/);
  assert.match(html, /params\.get\('launch'\) !== 'planning'/);
  assert.match(html, /composerInput\.textContent\s*=\s*planningPromptForContext\(planningContext\)/);
  assert.match(html, /@\u4eba工问答 \$\{context\.manualQaId\}/);
  assert.match(html, /目标规划文档：\$\{context\.targetDoc\}/);
  const initialize = html.match(/function initializePlanningLaunch\(\)([\s\S]*?)\n\s*function/)?.[1] || '';
  assert.doesNotMatch(initialize, /sendBtn\.click|renderPlanningResult/);
  assert.doesNotMatch(initialize, /fallbackIssue|ADTD-3191/);
  assert.match(initialize, /showPlanningLaunchError/);
});

test('planning context storage is validated, one-time, stale-aware, and exception-safe', () => {
  const isValidPlanningContextKey = extractFunction('isValidPlanningContextKey');
  globalThis.isValidPlanningContextKey = isValidPlanningContextKey;
  const getPlanningStorage = extractFunction('getPlanningStorage');
  const storePlanningLaunchContext = extractFunction('storePlanningLaunchContext');
  const consumePlanningLaunchContext = extractFunction('consumePlanningLaunchContext');
  const validKey = 'planning-context:123e4567-e89b-42d3-a456-426614174000';
  const validContext = {
    manualQaId: 'ADTD-3194', manualQaTitle: '标题', formalReply: '正式回复',
    targetDoc: '目标文档', table: 'STK288', evidence: '核验依据'
  };
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key)
  };
  assert.deepEqual(storePlanningLaunchContext(storage, validKey, validContext, 1_000), { ok: true });
  assert.equal(values.has(validKey), true);
  assert.deepEqual(consumePlanningLaunchContext(storage, validKey, 2_000), { ok: true, context: validContext });
  assert.equal(values.has(validKey), false, 'context must be removed on first consume');
  assert.deepEqual(consumePlanningLaunchContext(storage, validKey, 2_000), { ok: false, error: 'missing' });

  const malformedKey = 'planning-context:223e4567-e89b-42d3-a456-426614174000';
  values.set(malformedKey, '{not json');
  assert.deepEqual(consumePlanningLaunchContext(storage, malformedKey, 2_000), { ok: false, error: 'malformed' });
  assert.equal(values.has(malformedKey), false);
  const staleKey = 'planning-context:323e4567-e89b-42d3-a456-426614174000';
  values.set(staleKey, JSON.stringify({ createdAt: 1_000, context: validContext }));
  assert.deepEqual(consumePlanningLaunchContext(storage, staleKey, 1_000 + 5 * 60_000 + 1), { ok: false, error: 'stale' });
  assert.deepEqual(storePlanningLaunchContext(storage, validKey, { manualQaId: 'only-one-field' }, 1_000), { ok: false, error: 'invalid' });

  values.set('unrelated-app-key', 'must remain');
  let touched = false;
  const observedStorage = {
    setItem() { touched = true; },
    getItem() { touched = true; },
    removeItem() { touched = true; }
  };
  assert.deepEqual(storePlanningLaunchContext(observedStorage, 'unrelated-app-key', validContext, 1_000), { ok: false, error: 'invalid-key' });
  assert.deepEqual(consumePlanningLaunchContext(observedStorage, 'unrelated-app-key', 2_000), { ok: false, error: 'invalid-key' });
  assert.equal(touched, false, 'invalid keys must never touch storage');
  assert.equal(values.get('unrelated-app-key'), 'must remain');

  const throwingStorage = { setItem() { throw new Error('denied'); }, getItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.deepEqual(storePlanningLaunchContext(throwingStorage, validKey, validContext, 1_000), { ok: false, error: 'storage' });
  assert.deepEqual(consumePlanningLaunchContext(throwingStorage, validKey, 2_000), { ok: false, error: 'storage' });
  const blockedOwner = {};
  Object.defineProperty(blockedOwner, 'localStorage', { get() { throw new Error('denied'); } });
  assert.equal(getPlanningStorage(blockedOwner), null);
  assert.equal(getPlanningStorage({ localStorage: storage }), storage);
  assert.match(html, /getPlanningStorage\(window\)/);
  delete globalThis.isValidPlanningContextKey;
});

test('planning context keys use a strict namespaced UUID with a secure fallback', () => {
  const isValidPlanningContextKey = extractFunction('isValidPlanningContextKey');
  globalThis.isValidPlanningContextKey = isValidPlanningContextKey;
  const createPlanningContextKey = extractFunction('createPlanningContextKey');
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(isValidPlanningContextKey(`planning-context:${uuid}`), true);
  assert.equal(isValidPlanningContextKey(uuid), false);
  assert.equal(isValidPlanningContextKey('planning-context:../foreign-key'), false);
  assert.equal(createPlanningContextKey({ randomUUID: () => uuid }), `planning-context:${uuid}`);
  const fallback = createPlanningContextKey({ getRandomValues: bytes => bytes.fill(7) });
  assert.equal(isValidPlanningContextKey(fallback), true);
  assert.equal(createPlanningContextKey({}), null);
  delete globalThis.isValidPlanningContextKey;
  assert.match(html, /if \(opened\) setTimeout\(\(\) => removePlanningLaunchContext\(storage, contextKey\), 5 \* 60_000\)/);
});

test('planning popup helper cleans up blocked or failed launches without exposing context', () => {
  const openPlanningWindow = extractFunction('openPlanningWindow');
  const calls = [];
  assert.equal(openPlanningWindow(() => null, '/demo?launch=planning&contextKey=opaque', () => calls.push('cleanup')), false);
  assert.deepEqual(calls, ['cleanup']);
  assert.equal(openPlanningWindow(() => { throw new Error('blocked'); }, '/demo?launch=planning&contextKey=opaque', () => calls.push('cleanup-error')), false);
  assert.deepEqual(calls, ['cleanup', 'cleanup-error']);
  const popup = { opener: {} };
  assert.equal(openPlanningWindow(() => popup, '/demo?launch=planning&contextKey=opaque', () => calls.push('unexpected')), true);
  assert.equal(popup.opener, null);
});

test('planning launch reset preserves the resolved context for subsequent rendering', () => {
  const resetThenRestorePlanningContext = extractFunction('resetThenRestorePlanningContext');
  let liveContext = { manualQaId: 'stale' };
  const resolvedContext = { manualQaId: 'ADTD-3194', targetDoc: 'STK288 大宗交易规划文档' };
  const restored = resetThenRestorePlanningContext(() => {
    liveContext = null;
  }, resolvedContext);
  liveContext = restored;
  assert.equal(liveContext, resolvedContext);
  assert.equal(liveContext.manualQaId, 'ADTD-3194');
  assert.equal(liveContext.targetDoc, 'STK288 大宗交易规划文档');
  assert.match(html, /planningContext\s*=\s*resetThenRestorePlanningContext\(loadEmptyConversation, resolvedContext\)/);
});

test('every selectable manual issue maps to consistent fixed planning context', () => {
  const planningContextForIssue = extractFunction('planningContextForIssue');
  const cases = [
    ['ADTD-3194', 'STK288 公告披露大宗交易变动日期确认', 'STK288 大宗交易规划文档', 'STK288 大宗交易录入规则.docx'],
    ['ADTD-3191', '质检组规则确认', 'STK032 股东明细表规划文档', 'STK032 股东明细表录入规则.docx'],
    ['ADTD-3190', 'A股交易组规则确认', 'STK658 交易进展规划文档', 'STK658 进展维护规则.docx']
  ];
  for (const [id, title, targetDoc, ruleDoc] of cases) {
    const context = planningContextForIssue({ id, title, targetDoc, ruleDoc, table: id.replace('ADTD-', 'STK') }, '已提交回复');
    assert.equal(context.manualQaId, id);
    assert.equal(context.manualQaTitle, title);
    assert.equal(context.targetDoc, targetDoc);
    assert.equal(context.formalReply, '已提交回复');
    assert.match(context.evidence, new RegExp(id));
    assert.match(context.evidence, new RegExp(ruleDoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('planning launch supports both deterministic chat-only outcomes', () => {
  assert.match(html, /data-planning-outcome="no-update"[^>]*aria-pressed="false"[^>]*>无需更新<\/button>/);
  assert.match(html, /data-planning-outcome="update"[^>]*aria-pressed="true"[^>]*>生成修改建议<\/button>/);
  assert.match(html, /button\.setAttribute\('aria-pressed', String\(button === choice\)\)/);
  assert.match(html, /function planningResultHtml\(outcome, text, context\)/);
  assert.match(html, /class="planning-result" role="status" aria-live="polite"/);
  assert.match(html, /outcome === 'no-update'[\s\S]*?结论[\s\S]*?原因[\s\S]*?核验依据[\s\S]*?后续建议/);
  assert.match(html, /目标文档[\s\S]*?修改类型[\s\S]*?目标章节[\s\S]*?修改原因[\s\S]*?影响字段与范围[\s\S]*?建议文案[\s\S]*?依据[\s\S]*?风险/);
});

test('conversation transitions always clear planning launch mode before loading history', () => {
  const resetConversationModes = extractFunction('resetConversationModes');
  const steps = [];
  resetConversationModes(() => steps.push('manual'), () => steps.push('planning'), () => steps.push('draft'));
  assert.deepEqual(steps, ['manual', 'planning', 'draft']);
  for (const loader of ['loadEmptyConversation', 'loadArtifactConversation', 'loadManualQaConversation']) {
    assert.match(
      html,
      new RegExp(`function ${loader}\\(\\) \\{\\s*resetConversationModes\\(clearManualQaStory, clearPlanningStory, resetManualQaDraft\\)`),
      `${loader} must exit planning mode`
    );
  }
});

test('ordinary Agent and planning launch remain usable on narrow mobile screens', () => {
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.platform-nav[\s\S]*?display:\s*none/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.business-module[\s\S]*?display:\s*none/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.agent-sidebar[\s\S]*?display:\s*none/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.planning-outcome-picker[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.planning-result dl div[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.layout:not\(\.manual-system-mode\) > \.artifact:not\(\.open\)[^{]*\{\s*display:\s*none/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.layout:not\(\.manual-system-mode\) > \.artifact\.open\s*\{[\s\S]*?display:\s*flex[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*0[\s\S]*?z-index:\s*\d+/);
});

test('mobile artifact overlay has an explicit close control even without tabs', () => {
  assert.match(html, /<button class="artifact-pane-close" id="artifactPaneClose" type="button" aria-label="关闭产物窗口">/);
  assert.match(html, /\.artifact-pane-close\s*\{[\s\S]*?display:\s*none/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.artifact-pane-close\s*\{[\s\S]*?display:\s*inline-flex/);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.artifact\.open\.no-tabs \.artifact-head\s*\{\s*display:\s*flex/);
  assert.match(html, /const artifactPaneClose = document\.getElementById\('artifactPaneClose'\)/);
  assert.match(html, /artifactPaneClose\.addEventListener\('click', \(\) => setArtifactVisible\(false\)\)/);
});

test('sending a planning evaluation keeps artifacts closed and renders no planning file', () => {
  assert.match(html, /function submitPlanningEvaluation\(text\)/);
  const submit = html.match(/function submitPlanningEvaluation\(text\)([\s\S]*?)\n\s*function/)?.[1] || '';
  assert.match(html, /function planningResultHtml\(outcome, text, context\)/);
  assert.match(html, /bubble user[^`]*\$\{escapeHtml\(text\)\}/);
  assert.match(submit, /planningStory\.innerHTML\s*=\s*planningResultHtml\(planningOutcome, text, planningContext\)/);
  assert.doesNotMatch(submit, /setArtifactVisible\(true\)|renderArtifact|tabs\.(?:report|table|manualQa)\.open\s*=\s*true/);
  assert.doesNotMatch(html, /data-tab="planning|planningDocumentHtml|planningArtifact/);
  assert.match(html, /if \(planningLaunchMode\) \{[\s\S]*?submitPlanningEvaluation\(text\);[\s\S]*?return;/);
});

test('manual Q&A module handoff returns to Agent with only literal @人工问答 in composer', () => {
  assert.match(html, /function handoffManualQaToAgent\(\)/);
  assert.match(html, /setApplicationView\('agent'\)/);
  assert.match(html, /composerInput\.textContent\s*=\s*'@人工问答'/);
  assert.match(html, /id="composerInput" contenteditable="true"/);
  const handoff = html.match(/function handoffManualQaToAgent\(\)([\s\S]*?)\n\s*function/)?.[1] || '';
  assert.doesNotMatch(handoff, /请基于|提示词|规划文档|附件|sendBtn\.click|window\.open|launch-token/);
});

test('manual Q&A artifact header exposes open-in-module beside the overflow menu', () => {
  assert.match(html, /<button class="artifact-open-manual" id="openManualBtn" type="button" aria-label="在人工问答中打开" title="在人工问答中打开" hidden>/);
  assert.match(html, /id="openManualBtn"[\s\S]*?id="artifactMenuToggle"/);
  const menuSource = html.match(/<div class="artifact-menu" id="artifactMenu"[\s\S]*?<\/div>/)?.[0] || '';
  assert.doesNotMatch(menuSource, /data-artifact-action="open-manual"|在人工问答中打开/);
  assert.match(html, /function updateArtifactActions\(\)/);
  assert.match(html, /const isAgentFile = activeTab === 'report' \|\| activeTab === 'table'/);
  assert.match(html, /item\.disabled = !isAgentFile/);
  assert.match(html, /openManualBtn\.hidden = activeTab !== 'manualQa';/);
  assert.match(html, /openManualBtn\.addEventListener\('click', \(\) => runArtifactAction\('open-manual'\)\);/);
  assert.match(html, /if \(action === 'open-manual'\) \{[\s\S]*?setApplicationView\('manual-qa'\)/);
});
