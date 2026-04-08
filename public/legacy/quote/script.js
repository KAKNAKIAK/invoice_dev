
// =======================================================================
// 1. ?꾩뿭 蹂??諛??ㅼ젙
// =======================================================================
let quoteGroupsData = {}; // 紐⑤뱺 寃ъ쟻 洹몃９???곗씠?곕? ??ν븯???듭떖 媛앹껜 (?꾩옱 ?쒖꽦 ?몄뀡怨??숆린?붾맖)
let groupCounter = 0;
let activeGroupId = null;
let currentFileHandle = null;

const ROW_DEFINITIONS = [
    { id: 'airfare', label: '??났', type: 'costInput' }, { id: 'hotel', label: '?명뀛', type: 'costInput' },
    { id: 'ground', label: '吏??, type: 'costInput' }, { id: 'insurance', label: '蹂댄뿕', type: 'costInput' },
    { id: 'commission', label: '而ㅻ???, type: 'costInput' }, { id: 'addDynamicRow', label: '+', type: 'button' },
    { id: 'netCost', label: '?룰?', type: 'calculated' }, { id: 'salesPrice', label: '?곹뭹媛', type: 'salesInput' },
    { id: 'profitPerPerson', label: '1?몄닔??, type: 'calculated' }, { id: 'profitMargin', label: '1?몄닔?듬쪧', type: 'calculatedPercentage' }
];

// Firebase ?곕룞 愿??蹂??諛?珥덇린??(硫붿씤 ??
const firebaseConfig = {
    apiKey: "AIzaSyC7eXBtNczq0ylN5UZNyZaMUH3M-6Gicvc",
    authDomain: "memo-1-e9ee8.firebaseapp.com",
    projectId: "memo-1-e9ee8",
    storageBucket: "memo-1-e9ee8.appspot.com",
    messagingSenderId: "787316238134",
    appId: "1:787316238134:web:20b136703e76ff3de67597",
    measurementId: "G-WGB4VSG0MP"
};
const fbApp = firebase.initializeApp(firebaseConfig, 'memoApp');
const db = firebase.firestore(fbApp);

// =======================================================================
// 2. ?뚯씪 ???쒖뒪??- FileSession ?대옒?ㅼ? ?뚯씪 愿由?
// =======================================================================
class FileSession {
    constructor(fileId, displayName = '???뚯씪', fileHandle = null) {
        this.fileId = fileId;
        this.displayName = displayName;
        this.fileHandle = fileHandle;
        this.quoteGroupsData = {}; // 湲곗〈 援ъ“ 洹몃?濡??좎?
        this.groupCounter = 0;
        this.activeGroupId = null;
        this.memoText = '';
        this.customerInfo = [];
        this.uiState = {
            scrollTop: 0,
            activeTab: null,
            modalStates: {}
        };
        this.domCache = null; // DocumentFragment for detached DOM
        this.dirty = false;
        this.createdAt = new Date();
    }

    // ?몄뀡???뷀떚 ?곹깭 愿由?
    markDirty() {
        this.dirty = true;
        updateFileTabUI(this.fileId);
    }

    markClean() {
        this.dirty = false;
        updateFileTabUI(this.fileId);
    }

    // UI ?곹깭 ???
    saveUIState() {
        const workspace = document.getElementById('workspace');
        if (workspace) {
            this.uiState.scrollTop = workspace.scrollTop;
        }
        
        // ?꾩옱 ?쒖꽦 寃ъ쟻 洹몃９ ???
        this.uiState.activeGroupId = activeGroupId;
        
        // 硫붾え ?띿뒪?????
        const memoTextarea = document.getElementById('memoText');
        if (memoTextarea) {
            this.memoText = memoTextarea.value;
        }
        
        // 怨좉컼 ?뺣낫 ???
        this.customerInfo = getCustomerData();
        
        // ?꾩옱 寃ъ쟻 洹몃９ ?곗씠???숆린??
        if (activeGroupId) {
            syncGroupUIToData(activeGroupId);
        }
    }

    // UI ?곹깭 蹂듭썝
    restoreUIState() {
        // ?꾩뿭 蹂?섎뱾?????몄뀡??媛믪쑝濡?蹂듭썝
        quoteGroupsData = this.quoteGroupsData;
        groupCounter = this.groupCounter;
        activeGroupId = this.activeGroupId;
        
        const workspace = document.getElementById('workspace');
        if (workspace && this.uiState.scrollTop) {
            workspace.scrollTop = this.uiState.scrollTop;
        }
        
        // 硫붾え ?띿뒪??蹂듭썝
        const memoTextarea = document.getElementById('memoText');
        if (memoTextarea) {
            memoTextarea.value = this.memoText || '';
        }
        
        // 怨좉컼 ?뺣낫 蹂듭썝
        const customerContainer = document.getElementById('customerInfoContainer');
        if (customerContainer) {
            customerContainer.innerHTML = '';
            if (this.customerInfo && this.customerInfo.length > 0) {
                this.customerInfo.forEach(customer => createCustomerCard(customer));
            } else {
                createCustomerCard();
            }
        }
        
        // 寃ъ쟻 洹몃９ UI 蹂듭썝
        const tabsContainer = document.getElementById('quoteGroupTabs');
        const contentsContainer = document.getElementById('quoteGroupContentsContainer');
        if (tabsContainer) tabsContainer.innerHTML = '';
        if (contentsContainer) contentsContainer.innerHTML = '';
        
        // 紐⑤뱺 洹몃９ UI ?ㅼ떆 ?앹꽦
        Object.keys(this.quoteGroupsData).forEach(groupId => {
            createGroupUI(groupId);
        });
        
        // ?쒖꽦 洹몃９ 蹂듭썝
        if (this.activeGroupId && this.quoteGroupsData[this.activeGroupId]) {
            switchGroup(this.activeGroupId);
        }
        
        // ?대깽??由ъ뒪???щ컮?몃뵫 (以묒슂!)
        console.log('?대깽??由ъ뒪???щ컮?몃뵫 以?..');
        rebindWorkspaceEventListeners();
        console.log('?대깽??由ъ뒪???щ컮?몃뵫 ?꾨즺');
    }
}

// ?뚯씪 愿由ъ옄
const filesManager = new Map();
let currentFileId = null;
let fileIdCounter = 0;

// ?명솚???덉씠??- 湲곗〈 肄붾뱶媛 怨꾩냽 ?묐룞?섎룄濡??섎뒗 ?ы띁 ?⑥닔??
function getCurrentSession() {
    return filesManager.get(currentFileId);
}

function getCurrentQuoteGroups() {
    const session = getCurrentSession();
    if (session) {
        // ?꾩뿭 蹂?섏? ?몄뀡 ?곗씠???숆린??
        if (quoteGroupsData !== session.quoteGroupsData) {
            quoteGroupsData = session.quoteGroupsData;
        }
        return session.quoteGroupsData;
    }
    return {};
}

function updateCurrentSession() {
    const session = getCurrentSession();
    if (session) {
        session.quoteGroupsData = quoteGroupsData;
        session.groupCounter = groupCounter;
        session.activeGroupId = activeGroupId;
        session.markDirty();
    }
}

// ?뚯씪 ??UI 愿由?
function createFileTab(fileId, displayName, isActive = false) {
    const tabsContainer = document.getElementById('fileTabsContainer');
    const tab = document.createElement('div');
    tab.className = `file-tab flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
        isActive ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
    }`;
    tab.dataset.fileId = fileId;
    
    // ?뚯씪紐??쒖떆 (?뷀떚 ?곹깭 ?쒖떆 ?ы븿)
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm font-medium truncate max-w-32';
    nameSpan.textContent = displayName;
    
    const dirtyIndicator = document.createElement('span');
    dirtyIndicator.className = 'dirty-indicator text-orange-500 ml-1';
    dirtyIndicator.textContent = '??;
    dirtyIndicator.style.display = 'none';
    
    // ?リ린 踰꾪듉
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-file-btn text-gray-400 hover:text-red-500 ml-1 p-1';
    closeBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
    closeBtn.title = '?뚯씪 ?リ린';
    
    tab.appendChild(nameSpan);
    tab.appendChild(dirtyIndicator);
    tab.appendChild(closeBtn);
    tabsContainer.appendChild(tab);
    
    return tab;
}

function updateFileTabUI(fileId) {
    const session = filesManager.get(fileId);
    if (!session) return;
    
    const tab = document.querySelector(`[data-file-id="${fileId}"]`);
    if (!tab) return;
    
    const dirtyIndicator = tab.querySelector('.dirty-indicator');
    if (dirtyIndicator) {
        dirtyIndicator.style.display = session.dirty ? 'inline' : 'none';
    }
}

function switchFileTab(newFileId) {
    if (currentFileId === newFileId) return;
    
    // ?꾩옱 ?몄뀡 ?곹깭 ???
    if (currentFileId) {
        const currentSession = getCurrentSession();
        if (currentSession) {
            currentSession.saveUIState();
            
            // DOM 罹먯떆???꾩옱 ?뚰겕?ㅽ럹?댁뒪 ???
            const workspace = document.getElementById('workspace');
            if (workspace) {
                currentSession.domCache = document.createDocumentFragment();
                while (workspace.firstChild) {
                    currentSession.domCache.appendChild(workspace.firstChild);
                }
            }
        }
    }
    
    // ???몄뀡?쇰줈 ?꾪솚
    currentFileId = newFileId;
    const newSession = getCurrentSession();
    if (!newSession) return;
    
    // DOM 蹂듭썝
    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.innerHTML = '';
        if (newSession.domCache) {
            workspace.appendChild(newSession.domCache);
            newSession.domCache = null; // 罹먯떆 ?뺣━
        } else {
            // 泥?踰덉㎏ 濡쒕뱶??湲곕낯 援ъ“ ?앹꽦
            initializeWorkspaceForSession(newSession);
        }
    }
    
    // UI ?곹깭 蹂듭썝
    newSession.restoreUIState();
    
    // ??UI ?낅뜲?댄듃
    document.querySelectorAll('.file-tab').forEach(tab => {
        const isActive = tab.dataset.fileId === newFileId;
        tab.className = `file-tab flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
            isActive ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`;
    });
    
    // 寃ъ쟻 洹몃９ ???곸뿭 珥덇린??諛??ш뎄??
    const tabsContainer = document.getElementById('quoteGroupTabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = ''; // 湲곗〈 ??뱾 紐⑤몢 ?쒓굅
        
        // 寃ъ쟻 洹몃９ UI ?ㅼ떆 ?뚮뜑留?
        if (Object.keys(newSession.quoteGroupsData).length > 0) {
            Object.keys(newSession.quoteGroupsData).forEach(id => createGroupUI(id));
            if (newSession.activeGroupId && newSession.quoteGroupsData[newSession.activeGroupId]) {
                switchTab(newSession.activeGroupId);
            } else {
                const firstGroupId = Object.keys(newSession.quoteGroupsData)[0];
                if (firstGroupId) switchTab(firstGroupId);
            }
        } else {
            addNewGroup();
        }
    }
    
    // ?뚯씪 ???꾪솚 ???꾩슂???대깽??由ъ뒪???щ컮?몃뵫
    rebindWorkspaceEventListeners();
}

function makeTabNameEditable(spanElement, groupId) {
    if (spanElement.dataset.editing) return;
    spanElement.dataset.editing = 'true';
    
    const currentText = spanElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'tab-name-input';
    
    spanElement.style.display = 'none';
    spanElement.parentNode.insertBefore(input, spanElement);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName) {
            spanElement.textContent = newName;
            quoteGroupsData[groupId].name = newName;
            updateCurrentSession();
        }
        spanElement.style.display = '';
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
        delete spanElement.dataset.editing;
    };

    input.addEventListener('blur', finishEditing, { once: true });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentText; // Revert changes
            e.preventDefault();
            input.blur();
        }
    });
}

// ?뚰겕?ㅽ럹?댁뒪 ???대깽??由ъ뒪?덈? ?ㅼ떆 諛붿씤?⑺븯???⑥닔
function rebindWorkspaceEventListeners() {
    // ?뚯씪 遺덈윭?ㅺ린 label ?대깽???щ컮?몃뵫
    const loadFileLabel = document.querySelector('label[for="loadFile"]');
    if (loadFileLabel) {
        // 湲곗〈 ?대깽???쒓굅 ???덈줈 諛붿씤??
        loadFileLabel.replaceWith(loadFileLabel.cloneNode(true));
        const newLoadFileLabel = document.querySelector('label[for="loadFile"]');
        if (newLoadFileLabel) {
            newLoadFileLabel.addEventListener('click', (event) => {
                event.preventDefault();
                loadFile();
            });
        }
    }
    
    // ?뚰겕?ㅽ럹?댁뒪 ?ㅻ뜑 踰꾪듉???대깽??由ъ뒪???щ컮?몃뵫
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newSaveBtn = document.getElementById('saveBtn');
        if (newSaveBtn) {
            newSaveBtn.addEventListener('click', () => saveFile(false, newSaveBtn));
        }
    }

    const saveAsBtn = document.getElementById('saveAsBtn');
    if (saveAsBtn) {
        saveAsBtn.replaceWith(saveAsBtn.cloneNode(true));
        const newSaveAsBtn = document.getElementById('saveAsBtn');
        if (newSaveAsBtn) {
            newSaveAsBtn.addEventListener('click', () => saveFile(true, newSaveAsBtn));
        }
    }

    const newWindowBtn = document.getElementById('newWindowBtn');
    if (newWindowBtn) {
        newWindowBtn.replaceWith(newWindowBtn.cloneNode(true));
        const newNewWindowBtn = document.getElementById('newWindowBtn');
        if (newNewWindowBtn) {
            newNewWindowBtn.addEventListener('click', () => {
                window.open(window.location.href, '_blank');
            });
        }
    }

    const recentFilesBtn = document.getElementById('recentFilesBtn');
    if (recentFilesBtn) {
        recentFilesBtn.replaceWith(recentFilesBtn.cloneNode(true));
        const newRecentFilesBtn = document.getElementById('recentFilesBtn');
        if (newRecentFilesBtn) {
            newRecentFilesBtn.addEventListener('click', openRecentFilesModal);
        }
    }

    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) {
        addCustomerBtn.replaceWith(addCustomerBtn.cloneNode(true));
        const newAddCustomerBtn = document.getElementById('addCustomerBtn');
        if (newAddCustomerBtn) {
            newAddCustomerBtn.addEventListener('click', () => createCustomerCard());
        }
    }

    const loadMemoFromDbBtn = document.getElementById('loadMemoFromDbBtn');
    if (loadMemoFromDbBtn) {
        loadMemoFromDbBtn.replaceWith(loadMemoFromDbBtn.cloneNode(true));
        const newLoadMemoFromDbBtn = document.getElementById('loadMemoFromDbBtn');
        if (newLoadMemoFromDbBtn) {
            newLoadMemoFromDbBtn.addEventListener('click', openLoadMemoModal);
        }
    }

    // 寃ъ쟻 洹몃９ 踰꾪듉???대깽??諛붿씤??
    const newGroupBtn = document.getElementById('newGroupBtn');
    if (newGroupBtn) {
        newGroupBtn.replaceWith(newGroupBtn.cloneNode(true));
        const newNewGroupBtn = document.getElementById('newGroupBtn');
        if (newNewGroupBtn) {
            newNewGroupBtn.addEventListener('click', () => {
                groupCounter++;
                const newGroupId = `group_${Date.now()}`;
                quoteGroupsData[newGroupId] = {
                    name: `寃ъ쟻 ${groupCounter}`,
                    calculators: [],
                    flightSchedule: [],
                    priceInfo: [],
                    hotelMakerData: { allHotelData: [{ nameKo: '???명뀛 1', nameEn: "", website: "", image: "", description: "" }], currentHotelIndex: 0 },
                    itineraryData: { title: "???쇱젙??, days: [], editingTitle: false },
                    inclusionText: '',
                    exclusionText: ''
                };
                createGroupUI(newGroupId);
                switchGroup(newGroupId);
            });
        }
    }

    const copyGroupBtn = document.getElementById('copyGroupBtn');
    if (copyGroupBtn) {
        copyGroupBtn.replaceWith(copyGroupBtn.cloneNode(true));
        const newCopyGroupBtn = document.getElementById('copyGroupBtn');
        if (newCopyGroupBtn) {
            newCopyGroupBtn.addEventListener('click', () => {
                if (!activeGroupId) { showToastMessage('蹂듭궗??洹몃９??癒쇱? ?좏깮?섏꽭??', true); return; }
                syncGroupUIToData(activeGroupId);
                const sourceData = quoteGroupsData[activeGroupId];
                const newGroupId = `group_${Date.now()}`;
                quoteGroupsData[newGroupId] = JSON.parse(JSON.stringify(sourceData));
                groupCounter++;
                createGroupUI(newGroupId);
                switchGroup(newGroupId);
                
                // 寃ъ쟻 蹂듭궗 ??遺꾪븷 ?⑤꼸 ?덈퉬瑜?理쒖냼 ?덈퉬濡??ъ꽕??
                setTimeout(resetSplitPaneWidths, 50);
                
                showToastMessage('洹몃９??蹂듭궗?섏뿀?듬땲??');
            });
        }
    }

    const deleteGroupBtn = document.getElementById('deleteGroupBtn');
    if (deleteGroupBtn) {
        deleteGroupBtn.replaceWith(deleteGroupBtn.cloneNode(true));
        const newDeleteGroupBtn = document.getElementById('deleteGroupBtn');
        if (newDeleteGroupBtn) {
            newDeleteGroupBtn.addEventListener('click', deleteActiveGroup);
        }
    }

    // quoteGroupContentsContainer ?대깽???꾩엫 ?щ컮?몃뵫
    const contentsContainer = document.getElementById('quoteGroupContentsContainer');
    if (contentsContainer) {
        // 湲곗〈 ?대깽???쒓굅 ???덈줈 諛붿씤??
        contentsContainer.replaceWith(contentsContainer.cloneNode(true));
        const newContentsContainer = document.getElementById('quoteGroupContentsContainer');
        if (newContentsContainer) {
        newContentsContainer.addEventListener('click', (event) => {
            console.log('?대┃ ?대깽??媛먯???', event.target);
            const target = event.target;
            const button = target.closest('button');

            if (!button) {
                if(target.matches('.person-type-name-span, .person-count-span, .dynamic-row-label-span, .cost-row-label-span')) {
                    const calcContainer = target.closest('.calculator-instance');
                    const callback = () => calculateAll(calcContainer);
                    const inputType = target.classList.contains('person-count-span') ? 'number' : 'text';
                    makeEditable(target, inputType, callback);
                }
                return;
            }
            
            console.log('踰꾪듉 ?대┃??', button, 'classes:', button.className);
            const groupId = button.closest('.calculation-group-content')?.id.split('-').pop();
            console.log('groupId:', groupId);

                if (button.classList.contains('add-calculator-btn')) {
                    syncGroupUIToData(groupId);
                    const groupData = quoteGroupsData[groupId];
                    const newCalcData = { id: `calc_${Date.now()}`, pnr: '', tableHTML: null, pnrTitle: 'PNR ?뺣낫' };
                    groupData.calculators.push(newCalcData);
                    renderCalculators(groupId);
                } else if (button.classList.contains('copy-last-calculator-btn')) {
                     const groupData = quoteGroupsData[groupId];
                    if (!groupData || groupData.calculators.length === 0) { showToastMessage('蹂듭궗??寃ъ쟻 怨꾩궛???놁뒿?덈떎.', true); return; }
                    syncGroupUIToData(groupId);
                    const lastCalculatorData = groupData.calculators[groupData.calculators.length - 1];
                    const newCalcData = JSON.parse(JSON.stringify(lastCalculatorData));
                    newCalcData.id = `calc_${Date.now()}_${Math.random()}`;
                    groupData.calculators.push(newCalcData);
                    renderCalculators(groupId);
                } else if (button.classList.contains('delete-calculator-btn')) {
                    if (confirm('??寃ъ쟻 怨꾩궛湲곕? ??젣?섏떆寃좎뒿?덇퉴?')) {
                        const instance = button.closest('.calculator-instance');
                        const calcId = instance.dataset.calculatorId;
                        quoteGroupsData[groupId].calculators = quoteGroupsData[groupId].calculators.filter(c => c.id !== calcId);
                        instance.remove();
                    }
                } else if (button.classList.contains('add-person-type-btn')) {
                    const calcContainer = button.closest('.calculator-instance');
                    addPersonTypeColumn(calcContainer, '?꾨룞', 1);
                } else if (button.classList.contains('add-dynamic-row-btn')) {
                    const calcContainer = button.closest('.calculator-instance');
                    addDynamicCostRow(calcContainer);
                } else if (button.classList.contains('remove-col-btn')) {
                    if (confirm('?대떦 ??ぉ????젣?섏떆寃좎뒿?덇퉴?')) {
                        const headerCell = button.closest('th');
                        const colIndex = Array.from(headerCell.parentNode.children).indexOf(headerCell);
                        const calcContainer = button.closest('.calculator-instance');
                        calcContainer.querySelectorAll('.quote-table tr').forEach(row => row.cells[colIndex]?.remove());
                        updateSummaryRow(calcContainer);
                        calculateAll(calcContainer);
                    }
                } else if (button.classList.contains('dynamic-row-delete-btn')) {
                    if (confirm('?대떦 ??ぉ????젣?섏떆寃좎뒿?덇퉴?')) {
                         const calcContainer = button.closest('.calculator-instance');
                         button.closest('tr').remove();
                         calculateAll(calcContainer);
                    }
                } else if (button.id.startsWith('hm-copyHtmlBtn-')) {
                    hm_copyOptimizedHtml(groupId);
                } else if (button.id.startsWith('hm-previewHotelBtn-')) {
                    hm_previewHotelInfo(groupId);
                } else if (button.id.startsWith('hm-loadHotelHtmlBtn-')) {
                    hm_openLoadHotelSetModal(groupId);
                } else if (button.id.startsWith('hm-addHotelTabBtn-')) {
                    hm_addHotel(groupId);
                } else if (button.matches('.hotel-tab-button')) {
                    if(target.closest('.tab-delete-icon')) {
                         hm_deleteHotel(groupId, parseInt(button.dataset.index));
                    } else {
                         hm_switchTab(groupId, parseInt(button.dataset.index));
                    }
                } else if (button.classList.contains('parse-gds-btn')) {
                    window.open('./gds_parser/gds_parser.html', 'GDS_Parser', `width=800,height=500,top=${(screen.height / 2) - 250},left=${(screen.width / 2) - 400}`);
                } else if (button.classList.contains('copy-flight-schedule-btn')) {
                    copyHtmlToClipboard(generateFlightScheduleInlineHtml(quoteGroupsData[groupId].flightSchedule));
                } else if (button.classList.contains('copy-price-info-btn')) {
                    syncGroupUIToData(groupId);
                    copyHtmlToClipboard(generatePriceInfoInlineHtml(quoteGroupsData[groupId].priceInfo));
                } else if (button.classList.contains('add-flight-subgroup-btn')) {
                    const flightContainer = button.closest('section').querySelector('.flight-schedule-container');
                    const sg = { id: `flight_sub_${Date.now()}`, title: "", rows: [{}] };
                    if (!quoteGroupsData[groupId].flightSchedule) quoteGroupsData[groupId].flightSchedule = [];
                    quoteGroupsData[groupId].flightSchedule.push(sg);
                    createFlightSubgroup(flightContainer, sg, groupId);
                } else if (button.classList.contains('add-price-subgroup-btn')) {
                    const priceContainer = button.closest('section').querySelector('.price-info-container');
                    const defaultRows = [
                        { item: "?깆씤?붽툑", price: "0", count: "1", remarks: "" },
                        { item: "?뚯븘?붽툑", price: "0", count: "0", remarks: "留?~12?몃?留? },
                        { item: "?좎븘?붽툑", price: "0", count: "0", remarks: "留?4媛쒖썡誘몃쭔" }
                    ];
                    const sg = { id: `price_sub_${Date.now()}`, title: "", rows: defaultRows };
                    if (!quoteGroupsData[groupId].priceInfo) quoteGroupsData[groupId].priceInfo = [];
                    quoteGroupsData[groupId].priceInfo.push(sg);
                    createPriceSubgroup(priceContainer, sg, groupId);
                } else if (button.classList.contains('load-inclusion-exclusion-db-btn')) {
                    openLoadInclusionsModal();
                } else if (button.classList.contains('copy-inclusion-btn')) {
                    copyToClipboard(button.closest('div').nextElementSibling.value, '?ы븿 ?댁뿭');
                } else if (button.classList.contains('copy-exclusion-btn')) {
                    copyToClipboard(button.closest('div').nextElementSibling.value, '遺덊룷???댁뿭');
                } else if (button.classList.contains('delete-dynamic-section-btn')) {
                    const section = button.closest('.dynamic-section');
                    if (section.classList.contains('flight-schedule-subgroup')) {
                        quoteGroupsData[groupId].flightSchedule = quoteGroupsData[groupId].flightSchedule.filter(g => g.id !== section.id);
                    } else if (section.classList.contains('price-subgroup')) {
                        quoteGroupsData[groupId].priceInfo = quoteGroupsData[groupId].priceInfo.filter(g => g.id !== section.id);
                    }
                    section.remove();
                } else if (button.classList.contains('add-row-btn')) {
                    const section = button.closest('.dynamic-section');
                    const tbody = section.querySelector('tbody');
                    if (section.classList.contains('flight-schedule-subgroup')) {
                         const subgroupData = quoteGroupsData[groupId].flightSchedule.find(g => g.id === section.id);
                         const newRowData = {};
                         subgroupData.rows.push(newRowData);
                         addFlightRow(tbody, newRowData, subgroupData);
                    } else if (section.classList.contains('price-subgroup')) {
                        const subgroupData = quoteGroupsData[groupId].priceInfo.find(g => g.id === section.id);
                        const newRowData = { item: "", price: "0", count: "1", remarks: "" };
                        subgroupData.rows.push(newRowData);
                        addPriceRow(tbody, newRowData, subgroupData, section, groupId);
                    }
                } else if (button.classList.contains('delete-row-btn')) {
                    const section = button.closest('.dynamic-section');
                    const tr = button.closest('tr');
                    const tbody = tr.parentNode;
                    const rowIndex = Array.from(tbody.children).indexOf(tr);
                    if (section.classList.contains('flight-schedule-subgroup')) {
                        const subgroupData = quoteGroupsData[groupId].flightSchedule.find(g => g.id === section.id);
                        subgroupData.rows.splice(rowIndex, 1);
                    } else if (section.classList.contains('price-subgroup')) {
                        const subgroupData = quoteGroupsData[groupId].priceInfo.find(g => g.id === section.id);
                        if (subgroupData.rows.length > 1) {
                            subgroupData.rows.splice(rowIndex, 1);
                        } else {
                             showToastMessage('理쒖냼 ??媛쒖쓽 ?붽툑 ??ぉ? ?좎??댁빞 ?⑸땲??', true);
                             return;
                        }
                    }
                    tr.remove();
                    if (section.classList.contains('price-subgroup')) {
                        updateGrandTotal(section, groupId);
                    }
                } else if (button.classList.contains('day-toggle-button')) {
                     ip_handleToggleDayCollapse(event, button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
                }
                else if (
                    button.id.startsWith('ip-') ||
                    button.classList.contains('add-activity-button') ||
                    button.classList.contains('edit-activity-button') ||
                    button.classList.contains('duplicate-activity-button') ||
                    button.classList.contains('delete-activity-button')
                ) {
                    if (button.id.includes('loadFromDBBtn')) ip_openLoadTripModal(groupId);
                    else if (button.id.includes('copyInlineHtmlButton')) ip_handleCopyInlineHtml(groupId);
                    else if (button.id.includes('inlinePreviewButton')) ip_handleInlinePreview(groupId);
                    else if (button.id.includes('addDayButton')) ip_addDay(groupId);
                    else if (button.classList.contains('edit-date-button')) ip_handleEditDate(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
                    else if (button.classList.contains('save-date-button')) ip_handleSaveDate(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId, button.previousElementSibling.value);
                    else if (button.classList.contains('cancel-date-edit-button')) ip_handleCancelDateEdit(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
                    else if (button.classList.contains('delete-day-button')) ip_showConfirmDeleteDayModal(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
                    else if (button.classList.contains('add-activity-button')) ip_openAddActivityChoiceModal(groupId, button.closest('.day-content-wrapper').querySelector('.activities-list').dataset.dayIndex);
                    else if (button.classList.contains('edit-activity-button')) {
                        console.log('?몄쭛 踰꾪듉 ?대┃??- ?꾩옱 鍮꾪솢?깊솕??);
                        // ?몄쭛 湲곕뒫 鍮꾪솢?깊솕
                        return;
                    } else if (button.classList.contains('duplicate-activity-button')) {
                        console.log('蹂듭젣 踰꾪듉 ?대┃??- ?꾩옱 鍮꾪솢?깊솕??);
                        // 蹂듭젣 湲곕뒫 鍮꾪솢?깊솕
                        return;
                    } else if (button.classList.contains('delete-activity-button')) {
                        console.log('??젣 踰꾪듉 ?대┃??); // ?붾쾭源낆슜
                        const card = button.closest('.ip-activity-card');
                        if (card) {
                            if (confirm('???쇱젙????젣?섏떆寃좎뒿?덇퉴?')) {
                                ip_handleDeleteActivity(groupId, card.dataset.dayIndex, card.dataset.activityIndex);
                            }
                        } else {
                            console.error('?쒕룞 移대뱶瑜?李얠쓣 ???놁뒿?덈떎');
                        }
                    }
                }
            });
            
            // 異붽? ?대깽??由ъ뒪?덈뱾???щ컮?몃뵫
            newContentsContainer.addEventListener('focusin', (event) => {
                const target = event.target;
                if (target.matches('.cost-item, .sales-price')) {
                    const formula = target.dataset.formula;
                    if (formula) {
                        target.value = formula;
                    }
                    target.select();
                } else if (target.matches('.flight-schedule-cell, .price-table-cell')) {
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });

            newContentsContainer.addEventListener('focusout', (event) => {
                const target = event.target;
                if (target.matches('.cost-item, .sales-price')) {
                    const rawValue = target.value.trim();
                    if (rawValue.startsWith('=')) {
                        target.dataset.formula = rawValue;
                        const result = evaluateMath(rawValue.substring(1));
                        target.value = isNaN(result) ? 'Error' : Math.round(result).toLocaleString('ko-KR');
                    } else {
                        delete target.dataset.formula;
                        const numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                        target.value = numericValue.toLocaleString('ko-KR');
                    }
                    const calcContainer = target.closest('.calculator-instance');
                    if (calcContainer) calculateAll(calcContainer);
                } else if(target.matches('.flight-schedule-cell, .price-table-cell, .inclusion-text, .exclusion-text, .price-subgroup-title')) {
                    const groupId = target.closest('.calculation-group-content').id.split('-').pop();
                    syncGroupUIToData(groupId);
                }
            });

            newContentsContainer.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.matches('.cost-item, .sales-price')) {
                    event.preventDefault();
                    event.stopPropagation();
                    const currentCell = event.target.closest('td');
                    if (!currentCell) return;
                    const currentRow = currentCell.closest('tr');
                    const tableBody = currentRow.closest('tbody');
                    const allRows = Array.from(tableBody.querySelectorAll('tr'));
                    const currentRowIndex = allRows.indexOf(currentRow);
                    const currentCellIndex = Array.from(currentRow.children).indexOf(currentCell);
                    event.target.blur();
                    for (let i = currentRowIndex + 1; i < allRows.length; i++) {
                        const nextCell = allRows[i].cells[currentCellIndex];
                        if (nextCell) {
                            const nextInput = nextCell.querySelector('input[type="text"]');
                            if (nextInput) {
                                nextInput.focus();
                                return;
                            }
                        }
                    }
                }
            });
            
            newContentsContainer.addEventListener('dblclick', (event) => {
                if(event.target.matches('.sales-price')) {
                    const expression = event.target.dataset.formula || event.target.value;
                    const calculatedValue = evaluateMath(expression).toString();
                    copyToClipboard(calculatedValue, '?곹뭹媛');
                } else if(event.target.matches('.copy-customer-info-btn')) {
                     const inputElement = event.target.closest('div').querySelector('input');
                     copyToClipboard(inputElement.value, '怨좉컼?뺣낫');
                } else if (event.target.matches('.cost-row-label-span')) {
                    const span = event.target;
                    const groupId = span.closest('.calculation-group-content')?.id.split('-').pop();
                    if (!groupId) return;
                    makeEditable(span, 'text', () => {
                        syncGroupUIToData(groupId);
                        updateCurrentSession();
                    });
                } else if (event.target.matches('.pnr-title-span')) {
                    const span = event.target;
                    const instance = span.closest('.calculator-instance');
                    const groupId = instance.closest('.calculation-group-content').id.split('-').pop();
                    const calcId = instance.dataset.calculatorId;
                    
                    makeEditable(span, 'text', () => {
                        const calculatorData = quoteGroupsData[groupId].calculators.find(c => c.id === calcId);
                        if(calculatorData) {
                            calculatorData.pnrTitle = span.textContent; // Read from the span itself
                        }
                        updateCurrentSession();
                    });
                } else if (event.target.closest('.ip-day-header-container')) {
                    const header = event.target.closest('.ip-day-header-container');
                    const daySection = header.closest('.ip-day-section');
                    const button = event.target.closest('button');
                    const input = event.target.closest('input');

                    // Only trigger toggle if not clicking on a button or input
                    if (!button && !input) {
                        const dayIndex = daySection.dataset.dayId.split('-')[1];
                        const groupId = daySection.closest('.calculation-group-content').id.split('-').pop();
                        ip_handleToggleDayCollapse(event, dayIndex, groupId);
                    }
                } else if (event.target.closest('.ip-activity-card')) {
                    const card = event.target.closest('.ip-activity-card');
                    // Ensure not to trigger when clicking on links or buttons inside the card
                    if (event.target.closest('a, button')) {
                        return;
                    }
                    
                    const dayIndex = card.dataset.dayIndex;
                    const activityIndex = card.dataset.activityIndex;
                    const groupId = card.closest('.calculation-group-content').id.split('-').pop();

                    if (dayIndex !== undefined && activityIndex !== undefined && groupId) {
                        ip_openActivityModal(groupId, dayIndex, activityIndex);
                    }
                }
            });

            // Rebind 怨쇱젙?먯꽌 cloneNode(true)濡?Sortable 諛붿씤?⑹씠 ?щ씪吏????덉뼱
            // ?뚮뜑 ?꾨즺 ???쇱젙??drag/drop???ㅼ떆 珥덇린?뷀븳??
            reinitializeItineraryDragAndDrop(newContentsContainer);
            console.log('quoteGroupContentsContainer ?대깽??由ъ뒪???щ컮?몃뵫 ?꾨즺');
        } else {
            console.error('newContentsContainer瑜?李얠쓣 ???놁뒿?덈떎');
        }
    } else {
        console.error('quoteGroupContentsContainer瑜?李얠쓣 ???놁뒿?덈떎');
    }

    // 寃ъ쟻 洹몃９ ??而⑦뀒?대꼫 ?대깽???꾩엫 ?щ컮?몃뵫
    const quoteGroupTabs = document.getElementById('quoteGroupTabs');
    if (quoteGroupTabs) {
        quoteGroupTabs.replaceWith(quoteGroupTabs.cloneNode(true));
        const newQuoteGroupTabs = document.getElementById('quoteGroupTabs');
        if (newQuoteGroupTabs) {
            newQuoteGroupTabs.addEventListener('click', (event) => {
                const tabButton = event.target.closest('.quote-tab');
                if (tabButton) {
                    const groupId = tabButton.dataset.groupId;
                    if (event.target.classList.contains('close-tab-btn')) {
                        deleteGroup(groupId);
                    } else {
                        switchTab(groupId);
                    }
                }
            });

            newQuoteGroupTabs.addEventListener('dblclick', (event) => {
                const span = event.target;
                if (span.tagName === 'SPAN' && span.closest('.quote-tab')) {
                    const tab = span.closest('.quote-tab');
                    const groupId = tab.dataset.groupId;
                    makeTabNameEditable(span, groupId);
                }
            });
        }
    }
    
    // 怨좉컼 ?뺣낫 而⑦뀒?대꼫 ?대깽???꾩엫 ?щ컮?몃뵫
    const customerInfoContainer = document.getElementById('customerInfoContainer');
    if (customerInfoContainer) {
        customerInfoContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            if (button.classList.contains('remove-customer-btn')) {
                if (confirm('??怨좉컼 ?뺣낫瑜???젣?섏떆寃좎뒿?덇퉴?')) {
                    button.closest('.p-4').remove();
                }
            }
            else if (button.classList.contains('copy-customer-info-btn')) {
                const inputElement = button.previousElementSibling;
                if (inputElement && inputElement.value) {
                    copyToClipboard(inputElement.value, '怨좉컼?뺣낫');
                } else {
                    showToastMessage('蹂듭궗???댁슜???놁뒿?덈떎.', true);
                }
            }
        });

        customerInfoContainer.addEventListener('dblclick', (event) => {
            const inputElement = event.target;
            if (inputElement.matches('input[type="text"], input[type="tel"], input[type="email"]')) {
                if (inputElement.value) {
                    copyToClipboard(inputElement.value, '怨좉컼?뺣낫');
                }
            }
        });
    }
}

function createNewFileTab(displayName = null) {
    fileIdCounter++;
    const fileId = `file_${fileIdCounter}_${Date.now()}`;
    const fileName = displayName || `???뚯씪 ${fileIdCounter}`;
    
    const session = new FileSession(fileId, fileName);
    filesManager.set(fileId, session);
    
    createFileTab(fileId, fileName, true);
    switchFileTab(fileId);
    
    return fileId;
}

function closeFileTab(fileId) {
    const session = filesManager.get(fileId);
    if (!session) return;
    
    // ?뷀떚 ?곹깭 ?뺤씤
    if (session.dirty) {
        const result = confirm(`'${session.displayName}' ?뚯씪????ν븯吏 ?딆? 蹂寃쎌궗??씠 ?덉뒿?덈떎. ?뺣쭚 ?レ쑝?쒓쿋?듬땲源?`);
        if (!result) return;
    }
    
    // ???쒓굅
    const tab = document.querySelector(`[data-file-id="${fileId}"]`);
    if (tab) tab.remove();
    
    // ?몄뀡 ?쒓굅
    filesManager.delete(fileId);
    
    // ?ㅻⅨ ??쑝濡??꾪솚?섍굅???????앹꽦
    if (currentFileId === fileId) {
        const remainingFiles = Array.from(filesManager.keys());
        if (remainingFiles.length > 0) {
            switchFileTab(remainingFiles[remainingFiles.length - 1]);
        } else {
            createNewFileTab();
        }
    }
}

function initializeWorkspaceForSession(session) {
    // 湲곕낯 ?뚰겕?ㅽ럹?댁뒪 HTML 援ъ“ ?앹꽦
    const workspace = document.getElementById('workspace');
    workspace.innerHTML = `
        <header class="mb-8 flex justify-between items-center">
            <div class="flex items-baseline gap-4">
                <h1 class="text-3xl font-bold text-indigo-700">2025 寃ъ쟻</h1>
                <a href="./manual/index.html" target="_blank" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline">?ъ슜 留ㅻ돱??/a>
            </div>
            <div class="flex items-center space-x-2 flex-wrap">
                <button type="button" id="newWindowBtn" class="btn btn-sm btn-secondary"><i class="far fa-window-restore"></i> ?덉갹(Shift+N)</button>
                <button type="button" id="saveBtn" class="btn btn-sm btn-secondary"><i class="fas fa-save"></i> ???F2)</button>
                <button type="button" id="saveAsBtn" class="btn btn-sm btn-secondary"><i class="fas fa-file-export"></i> ?ㅻⅨ ?대쫫?쇰줈 ???F3)</button>
                <label for="loadFile" class="btn btn-sm btn-secondary cursor-pointer"><i class="fas fa-folder-open"></i> 遺덈윭?ㅺ린(F4)</label>
                <button type="button" id="recentFilesBtn" class="btn btn-sm btn-secondary"><i class="fas fa-history"></i> 理쒓렐 ?뚯씪(Shift+Y)</button>
            </div>
        </header>
        <form id="quoteForm" onsubmit="return false;">
            <div class="flex flex-col lg:flex-row gap-6 mb-8">
                <section class="lg:w-1/2 p-4 sm:p-6 border border-gray-200 rounded-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-base font-semibold text-gray-800">怨좉컼 ?뺣낫</h2>
                        <button type="button" id="addCustomerBtn" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                            <i class="fas fa-plus-circle mr-1"></i>?곕씫泥?異붽?
                        </button>
                    </div>
                    <div id="customerInfoContainer" class="flex flex-wrap gap-4"></div>
                </section>
                <div class="lg:w-1/2 flex flex-col sm:flex-row gap-6">
                    <section class="w-full sm:w-1/2 p-4 sm:p-6 border border-gray-200 rounded-lg flex flex-col">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-base font-semibold text-gray-800">硫붾え</h2>
                            <button type="button" id="loadMemoFromDbBtn" class="btn btn-sm btn-outline"><i class="fas fa-database mr-1"></i> DB</button>
                        </div>
                        <textarea id="memoText" class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm" placeholder="硫붾え ?낅젰..."></textarea>
                        <button type="button" id="copyMemoBtn" class="mt-2 btn btn-sm btn-outline"><i class="far fa-copy"></i> 硫붾え 蹂듭궗</button>
                    </section>
                    <section class="w-full sm:w-1/2 p-4 sm:p-6 border border-gray-200 rounded-lg">
                        <h2 class="text-base font-semibold text-gray-800 mb-4">?낅Т 蹂댁“ ??/h2>
                        <div class="grid grid-cols-1 gap-2 mt-4">
                            <a href="https://kaknakiak.github.io/ERPTOGDS/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">GDS ?뷀듃由??앹꽦湲?/a>
                            <a href="https://kaknakiak.github.io/PNRTOERP/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">PNR ?ㅼ엫?꾨뱶異붿텧</a>
                            <a href="https://incomparable-meringue-d33b6b.netlify.app/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">媛꾪렪 URL ?⑥텞湲?/a>
                            <a href="https://kaknakiak.github.io/hotelbooking/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">?명뀛 ?섎같???묒꽦湲?/a>
                            <a href="https://kaknakiak.github.io/hotelinformation/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">?명뀛移대뱶 硫붿씠而?/a>
                            <a href="https://kaknakiak.github.io/tripplantest2/" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline text-center">?곸꽭?쇱젙??/a>
                        </div>
                    </section>
                </div>
            </div>
            <hr class="my-10 border-gray-300">
            <div class="quote-group-controls">
                <div id="quoteGroupTabs" class="quote-group-tabs-container"></div>
                <div class="quote-group-buttons">
                    <button type="button" id="newGroupBtn" class="btn btn-sm btn-blue"><i class="fas fa-plus"></i> ??洹몃９</button>
                    <button type="button" id="copyGroupBtn" class="btn btn-sm btn-yellow"><i class="fas fa-copy"></i> 洹몃９ 蹂듭궗</button>
                    <button type="button" id="deleteGroupBtn" class="btn btn-sm btn-red"><i class="fas fa-trash-alt"></i> 洹몃９ ??젣</button>
                </div>
            </div>
            <div id="quoteGroupContentsContainer" class="border border-t-0 border-gray-300 rounded-lg rounded-tl-none p-4"></div>
        </form>
    `;
}

// =======================================================================
// 3. IndexedDB ?ы띁 ?⑥닔 (?뚯씪 ?몃뱾 ??μ쓣 ?꾪빐)
// =======================================================================
const IDB_NAME = 'FileHandlesDB';
const IDB_STORE_NAME = 'fileHandles';
let idbPromise;

function initDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onerror = () => reject("IndexedDB error: " + request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
                db.createObjectStore(IDB_STORE_NAME, { keyPath: 'name' });
            }
        };
    });
    return idbPromise;
}

async function saveFileHandle(name, handle) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.put({ name, handle, timestamp: new Date() });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to save file handle: " + request.error);
    });
}

async function getFileHandle(name) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.get(name);
        request.onsuccess = () => resolve(request.result?.handle);
        request.onerror = () => reject("Failed to get file handle: " + request.error);
    });
}

async function getAllFileHandles() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted);
        };
        request.onerror = () => reject("Failed to get all file handles: " + request.error);
    });
}

async function deleteFileHandle(name) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.delete(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to delete file handle: " + request.error);
    });
}

// =======================================================================
// 3. GDS ?뚯꽌 ?곕룞 ?⑥닔
// =======================================================================
function addFlightsFromParser(parsedFlights) {
    if (!parsedFlights || parsedFlights.length === 0) return;
    if (!activeGroupId) { showToastMessage("?뚯떛????났?몄쓣 異붽????쒖꽦 寃ъ쟻???놁뒿?덈떎.", true); return; }
    const activeGroupData = quoteGroupsData[activeGroupId];
    const activeGroupElement = document.getElementById(`group-content-${activeGroupId}`);
    if (!activeGroupData || !activeGroupElement) return;
    const flightContainer = activeGroupElement.querySelector('.flight-schedule-container');
    const airlineCodeMap = {
        "KE": "??쒗빆怨?, "OZ": "?꾩떆?꾨굹??났", "7C": "?쒖＜??났", "LJ": "吏꾩뿉??, "TW": "?곗썾?댄빆怨?, "RS": "?먯뼱?쒖슱", "BX": "?먯뼱遺??, "ZE": "?댁뒪???났",
        "NH": "?꾩씪蹂멸났??ANA)", "JL": "?쇰낯??났", "MM": "?쇱튂??났", "CA": "以묎뎅援?젣??났", "MU": "以묎뎅?숇갑??났", "CZ": "以묎뎅?⑤갑??났", "CX": "罹먯꽭?댄띁?쒗뵿",
        "CI": "以묓솕??났", "BR": "?먮컮??났", "SQ": "?깃??щⅤ??났", "TG": "??댄빆怨?, "VN": "踰좏듃?⑦빆怨?, "VJ": "鍮꾩뿣??빆怨?, "QH": "諭遺??났",
        "PR": "?꾨━???났", "MH": "留먮젅?댁떆?꾪빆怨?, "GA": "媛猷⑤떎?몃룄?ㅼ떆?꾪빆怨?, "EK": "?먮??덉씠?명빆怨?, "QR": "移댄?瑜댄빆怨?, "EY": "?먰떚?섎뱶??났", "SV": "?ъ슦?붿븘??났", "TK": "?고궎??났",
        "AA": "?꾨찓由ъ뭏??났", "UA": "?좊굹?댄떚?쒗빆怨?, "DL": "?명???났", "HA": "?섏??댁븞??났", "AS": "?뚮옒?ㅼ뭅??났", "AC": "?먯뼱罹먮굹??, "AM": "?꾩뿉濡쒕찕?쒖퐫",
        "AF": "?먯뼱?꾨옉??, "KL": "KLM?ㅻ뜙??쒗빆怨?, "BA": "?곴뎅??났", "VS": "踰꾩쭊?좏??쒗떛", "LH": "猷⑦봽?명븳??, "AZ": "?뚮━?덈━??ITA)", "IB": "?대쿋由ъ븘??났", "LX": "?ㅼ쐞?ㅺ뎅?쒗빆怨?, "AY": "??먯뼱", "SU": "?꾩뿉濡쒗뵆濡쒗듃",
        "QF": "肄댄??ㅽ빆怨?, "NZ": "?먯뼱?댁쭏?쒕뱶"
    };
    const firstFlightAirlineCode = parsedFlights[0].airlineCode;
    const subgroupTitle = airlineCodeMap[firstFlightAirlineCode] || firstFlightAirlineCode;
    const newSubgroup = { id: `flight_sub_${Date.now()}`, title: subgroupTitle, rows: parsedFlights.map(flight => ({ ...flight })) };
    if (!activeGroupData.flightSchedule) activeGroupData.flightSchedule = [];
    activeGroupData.flightSchedule.push(newSubgroup);
    createFlightSubgroup(flightContainer, newSubgroup, activeGroupId);
    showToastMessage("GDS ??났 ?뺣낫媛 異붽??섏뿀?듬땲??");
}

// =======================================================================
// ?쇄뼹??4. ?명뀛移대뱶 硫붿씠而?(Hotel Maker) ?듯빀 肄붾뱶 ?쇄뼹??
// =======================================================================
const hmFirebaseConfig = {
    apiKey: "AIzaSyDsV5PGKMFdCDKgFfl077-DuaYv6N5kVNs",
    authDomain: "hotelinformation-app.firebaseapp.com",
    projectId: "hotelinformation-app",
    storageBucket: "hotelinformation-app.firebasestorage.app",
    messagingSenderId: "1027315001739",
    appId: "1:1027315001739:web:d7995a67062441fa93a78e",
    measurementId: "G-X889T0FZCY"
};
const hmFbApp = firebase.initializeApp(hmFirebaseConfig, 'hotelMakerApp');
const hmDb = firebase.firestore(hmFbApp);

function initializeHotelMakerForGroup(container, groupId) {
    container.innerHTML = `
        <div class="hm-controls flex flex-wrap gap-2 justify-end mb-4">
            <button id="hm-copyHtmlBtn-${groupId}" class="btn btn-sm btn-outline"><i class="fas fa-copy"></i> 肄붾뱶 蹂듭궗</button>
            <button id="hm-previewHotelBtn-${groupId}" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> 誘몃━蹂닿린</button>
            <button id="hm-loadHotelHtmlBtn-${groupId}" class="btn btn-sm btn-green"><i class="fas fa-database"></i> DB 遺덈윭?ㅺ린</button>
        </div>
        <div id="hm-hotelTabsContainer-${groupId}" class="hm-tabs-container flex flex-wrap items-center border-b-2 border-gray-200 mb-4">
            <button id="hm-addHotelTabBtn-${groupId}" class="hotel-tab-button"><i class="fas fa-plus mr-2"></i>???명뀛 異붽?</button>
        </div>
        <div id="hm-hotelEditorForm-${groupId}" class="hm-editor-form">
            <div class="input-card-group bg-white p-4 rounded-lg border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-field"><input type="text" id="hm-hotelNameKo-${groupId}" class="input-field" placeholder=" "><label for="hm-hotelNameKo-${groupId}">?명뀛紐?(?쒓?)</label></div>
                    <div class="form-field"><input type="text" id="hm-hotelNameEn-${groupId}" class="input-field" placeholder=" "><label for="hm-hotelNameEn-${groupId}">?명뀛紐?(?곷Ц)</label></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div class="form-field"><input type="url" id="hm-hotelWebsite-${groupId}" class="input-field" placeholder=" "><label for="hm-hotelWebsite-${groupId}">?명뀛 ?뱀궗?댄듃</label></div>
                    <div class="form-field"><input type="url" id="hm-hotelImage-${groupId}" class="input-field" placeholder=" "><label for="hm-hotelImage-${groupId}">????대?吏 URL</label></div>
                </div>
                <div class="form-field mt-4"><textarea id="hm-hotelDescription-${groupId}" class="input-field" rows="4" placeholder=" "></textarea><label for="hm-hotelDescription-${groupId}">媛꾨떒 ?ㅻ챸</label></div>
            </div>
        </div>
    `;

    hm_render(groupId);
}

function hm_render(groupId) {
    hm_renderTabs(groupId);
    hm_renderEditorForCurrentHotel(groupId);
}

function hm_syncCurrentHotelData(groupId) {
    const hotelData = quoteGroupsData[groupId]?.hotelMakerData;
    if (!hotelData || hotelData.currentHotelIndex === -1 || hotelData.currentHotelIndex >= hotelData.allHotelData.length) return;

    const groupEl = document.getElementById(`group-content-${groupId}`);
    if (!groupEl) return;

    const currentHotel = hotelData.allHotelData[hotelData.currentHotelIndex];
    if (!currentHotel) return;

    currentHotel.nameKo = groupEl.querySelector(`#hm-hotelNameKo-${groupId}`).value.trim();
    currentHotel.nameEn = groupEl.querySelector(`#hm-hotelNameEn-${groupId}`).value.trim();
    currentHotel.website = groupEl.querySelector(`#hm-hotelWebsite-${groupId}`).value.trim();
    currentHotel.image = groupEl.querySelector(`#hm-hotelImage-${groupId}`).value.trim();
    currentHotel.description = groupEl.querySelector(`#hm-hotelDescription-${groupId}`).value.trim();
}

function hm_renderTabs(groupId) {
    const groupEl = document.getElementById(`group-content-${groupId}`);
    if (!groupEl) return;
    const hotelData = quoteGroupsData[groupId]?.hotelMakerData;
    if (!hotelData) return;
    
    const tabsContainer = groupEl.querySelector(`#hm-hotelTabsContainer-${groupId}`);
    const addBtn = groupEl.querySelector(`#hm-addHotelTabBtn-${groupId}`);

    tabsContainer.querySelectorAll('.hotel-tab-button:not([id^="hm-addHotelTabBtn-"])').forEach(tab => tab.remove());

    hotelData.allHotelData.forEach((hotel, index) => {
        const tabButton = document.createElement('button');
        tabButton.className = 'hotel-tab-button';
        tabButton.dataset.index = index;
        if (index === hotelData.currentHotelIndex) {
            tabButton.classList.add('active');
        }
        tabButton.innerHTML = `<span class="tab-title">${hotel.nameKo || `???명뀛 ${index + 1}`}</span><i class="fas fa-times tab-delete-icon" title="???명뀛 ?뺣낫 ??젣"></i>`;
        
        tabsContainer.insertBefore(tabButton, addBtn);
    });
}

function hm_renderEditorForCurrentHotel(groupId) {
    const groupEl = document.getElementById(`group-content-${groupId}`);
    if (!groupEl) return;
    const hotelData = quoteGroupsData[groupId]?.hotelMakerData;
    if (!hotelData) return;
    const editorForm = groupEl.querySelector(`#hm-hotelEditorForm-${groupId}`);

    if (hotelData.currentHotelIndex === -1 || !hotelData.allHotelData[hotelData.currentHotelIndex]) {
        editorForm.classList.add('disabled');
        editorForm.querySelectorAll('input, textarea').forEach(el => { el.value = ''; el.placeholder = ' '; });
        return;
    }

    editorForm.classList.remove('disabled');
    const hotel = hotelData.allHotelData[hotelData.currentHotelIndex];
    groupEl.querySelector(`#hm-hotelNameKo-${groupId}`).value = hotel.nameKo || '';
    groupEl.querySelector(`#hm-hotelNameEn-${groupId}`).value = hotel.nameEn || '';
    groupEl.querySelector(`#hm-hotelWebsite-${groupId}`).value = hotel.website || '';
    groupEl.querySelector(`#hm-hotelImage-${groupId}`).value = hotel.image || '';
    groupEl.querySelector(`#hm-hotelDescription-${groupId}`).value = hotel.description || '';
    editorForm.querySelectorAll('input, textarea').forEach(el => { if(el.value) el.placeholder = ' '; });
}

function hm_switchTab(groupId, index) {
    hm_syncCurrentHotelData(groupId);
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    hotelData.currentHotelIndex = index;
    hm_render(groupId);
}

function hm_addHotel(groupId) {
    hm_syncCurrentHotelData(groupId);
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    const newHotel = { nameKo: `???명뀛 ${hotelData.allHotelData.length + 1}`, nameEn: "", website: "", image: "", description: "" };
    hotelData.allHotelData.push(newHotel);
    hm_switchTab(groupId, hotelData.allHotelData.length - 1);
}

function hm_deleteHotel(groupId, indexToDelete) {
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    const hotelName = hotelData.allHotelData[indexToDelete].nameKo || `???명뀛 ${indexToDelete + 1}`;
    if (!confirm(`'${hotelName}' ?명뀛????젣?섏떆寃좎뒿?덇퉴?`)) return;

    hotelData.allHotelData.splice(indexToDelete, 1);

    if (hotelData.currentHotelIndex >= indexToDelete) {
        hotelData.currentHotelIndex = Math.max(0, hotelData.currentHotelIndex - 1);
    }
    
    if (hotelData.allHotelData.length === 0) {
        hotelData.currentHotelIndex = -1;
    }

    hm_render(groupId);
}

function hm_copyOptimizedHtml(groupId) {
    hm_syncCurrentHotelData(groupId);
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    if (hotelData.currentHotelIndex === -1) {
        showToastMessage('蹂듭궗???명뀛???좏깮?댁＜?몄슂.', true);
        return;
    }
    const hotel = hotelData.allHotelData[hotelData.currentHotelIndex];
    const htmlToCopy = hm_generateHotelCardHtml(hotel);
    navigator.clipboard.writeText(htmlToCopy)
        .then(() => showToastMessage('?명뀛 移대뱶 HTML 肄붾뱶媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??'))
        .catch(err => showToastMessage('蹂듭궗???ㅽ뙣?덉뒿?덈떎.', true));
}

function hm_previewHotelInfo(groupId) {
    hm_syncCurrentHotelData(groupId);
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    if (hotelData.allHotelData.length === 0) {
        showToastMessage('誘몃━蹂닿린???명뀛 ?뺣낫媛 ?놁뒿?덈떎.', true);
        return;
    }
    const previewHtml = hm_generateFullPreviewHtml(hotelData.allHotelData);
    const previewWindow = window.open('', '_blank', 'width=900,height=600,scrollbars=yes,resizable=yes');
    if (previewWindow) {
        previewWindow.document.open();
        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
    } else {
        showToastMessage('?앹뾽??李⑤떒?섏뼱 誘몃━蹂닿린瑜??????놁뒿?덈떎.', true);
    }
}

async function hm_openLoadHotelSetModal(groupId) {
    let modal = document.getElementById('hm_loadHotelSetModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'hm_loadHotelSetModal';
    modal.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50";
    modal.innerHTML = `
        <div class="relative p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div class="flex justify-between items-center mb-3"><h3 class="text-lg font-medium">??λ맂 ?명뀛 ?뺣낫 遺덈윭?ㅺ린</h3><button id="hm_closeLoadHotelSetModalButton" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>
            <input type="text" id="hm_hotelSetSearchInput" placeholder="??λ맂 ?대쫫?쇰줈 寃??.." class="w-full p-2 mb-3 border rounded-md">
            <ul id="hm_hotelSetListForLoad" class="mt-2 h-60 overflow-y-auto border rounded-md divide-y"></ul>
            <div id="hm_loadingHotelSetListMsg" class="mt-2 text-sm" style="display:none;">紐⑸줉??遺덈윭?ㅻ뒗 以?..</div>
            <div class="mt-4"><button id="hm_cancelLoadHotelSetModalButton" class="btn btn-outline w-full">?リ린</button></div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#hm_closeLoadHotelSetModalButton').addEventListener('click', closeModal);
    modal.querySelector('#hm_cancelLoadHotelSetModalButton').addEventListener('click', closeModal);

    const listEl = modal.querySelector('#hm_hotelSetListForLoad');
    const loadingMsg = modal.querySelector('#hm_loadingHotelSetListMsg');
    const searchInput = modal.querySelector('#hm_hotelSetSearchInput');
    
    loadingMsg.style.display = 'block';
    listEl.innerHTML = '';

    try {
        const querySnapshot = await hmDb.collection("hotels").orderBy("timestamp", "desc").get();
        const allSets = [];
        querySnapshot.forEach(doc => allSets.push({ id: doc.id, ...doc.data() }));
        loadingMsg.style.display = 'none';

        const renderList = (sets) => {
            listEl.innerHTML = sets.length ? '' : `<li class="p-3 text-center text-gray-500">寃곌낵媛 ?놁뒿?덈떎.</li>`;
            sets.forEach(set => {
                const li = document.createElement('li');
                li.className = 'p-3 hover:bg-gray-100 cursor-pointer';
                li.textContent = set.name;
                li.addEventListener('click', () => {
                    hm_addHotelsFromDbToGroup(groupId, set.hotels);
                    showToastMessage(`'${set.name}'???명뀛 ?뺣낫媛 ?꾩옱 紐⑸줉??異붽??섏뿀?듬땲??`);
                    closeModal();
                });
                listEl.appendChild(li);
            });
        };
        
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            const filtered = allSets.filter(s => s.name.toLowerCase().includes(term));
            renderList(filtered);
        });

        renderList(allSets);

    } catch (error) {
        loadingMsg.textContent = '紐⑸줉 濡쒕뵫 ?ㅽ뙣';
        showToastMessage('?명뀛 紐⑸줉??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', true);
    }
}

function hm_addHotelsFromDbToGroup(groupId, hotelsToAdd) {
    if (!hotelsToAdd || hotelsToAdd.length === 0) return;
    hm_syncCurrentHotelData(groupId);
    const hotelData = quoteGroupsData[groupId].hotelMakerData;
    
    if (hotelData.allHotelData.length === 1 && hotelData.allHotelData[0].nameKo.startsWith('???명뀛')) {
        hotelData.allHotelData = JSON.parse(JSON.stringify(hotelsToAdd));
        hotelData.currentHotelIndex = 0;
    } else {
        hotelData.allHotelData.push(...JSON.parse(JSON.stringify(hotelsToAdd)));
        hotelData.currentHotelIndex = hotelData.allHotelData.length - hotelsToAdd.length;
    }

    hm_render(groupId);
}

/**
 * [?섏젙?? ?명뀛 移대뱶 HTML ?앹꽦 ?⑥닔
 * .txt ?뚯씪 湲곗???<div> 諛?flex ?덉씠?꾩썐?쇰줈 蹂寃?
 * @param {object} hotel - ?명뀛 ?뺣낫 媛앹껜
 * @returns {string} - <div> 湲곕컲 HTML 議곌컖
 */
function hm_generateHotelCardHtml(hotel) {
    const placeholderImage = 'https://placehold.co/400x300/e2e8f0/cbd5e0?text=No+Image';
    const currentHotelImage = (typeof hotel.image === 'string' && hotel.image.startsWith('http')) ? hotel.image : placeholderImage;

    const descriptionItems = hotel.description ? hotel.description.split('\n').filter(line => line.trim() !== '') : [];
    const descriptionHtml = descriptionItems.map(item => `
      <div style="margin-bottom: 6px; line-height: 1.6;"><span style="font-size: 12px; color: #34495e;">${item.replace(/??/g, '')}</span></div>`).join('');

    const websiteButtonHtml = hotel.website ? `
      <div style="margin-top: 20px;"><a href="${hotel.website}" target="_blank" style="background-color: #3498db; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 12px;">?뱀궗?댄듃 諛붾줈媛湲?/a></div>` : '';

    // 湲곗〈 <table> 湲곕컲 肄붾뱶瑜?<div> 湲곕컲(泥⑤??뚯씪) 肄붾뱶濡??泥?
    return `
<div style="max-width: 750px; margin: 24px auto; font-family: 'Malgun Gothic', '留묒? 怨좊뵓', sans-serif; display: flex; flex-wrap: wrap; align-items: center; box-sizing: border-box;">

  <div style="width: 100%; max-width: 320px; margin-right: 24px; margin-bottom: 24px; box-sizing: border-box;">
    <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
      <img src="${currentHotelImage}" alt="${hotel.nameKo || '?명뀛 ?대?吏'}" style="width: 100%; height: auto; display: block;" onerror="this.onerror=null; this.src='${placeholderImage}';">
      <div style="padding: 16px 20px;">
        <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">${hotel.nameKo || '?명뀛紐??놁쓬'}</div>
        ${hotel.nameEn ? `<div style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">${hotel.nameEn}</div>` : ''}
      </div>
    </div>
  </div>

  <div style="flex: 1; min-width: 300px; vertical-align: middle; box-sizing: border-box;">
    <div>
      ${descriptionHtml}
      ${websiteButtonHtml}
    </div>
  </div>

</div>`;
}


function hm_generateFullPreviewHtml(data) {
    const hotelName = data.length > 0 ? data[0].nameKo : '?명뀛';
    const sliderHead = data.length > 1 ? `<link rel="stylesheet" href="https://unpkg.com/swiper/swiper-bundle.min.css" /><script src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>` : '';
    const sliderBodyScript = data.length > 1 ? `<script>new Swiper('.swiper', {loop: true, pagination: {el: '.swiper-pagination', clickable: true}, navigation: {nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev'}});</script>` : '';
    
    let bodyContent;
    if (data.length > 1) {
        const slides = data.map(hotel => `<div class="swiper-slide">${hm_generateHotelCardHtml(hotel)}</div>`).join('');
        bodyContent = `<div class="swiper" style="max-width: 800px; margin: auto;"><div class="swiper-wrapper">${slides}</div><div class="swiper-pagination"></div><div class="swiper-button-prev"></div><div class="swiper-button-next"></div></div>`;
    } else if (data.length === 1) {
        bodyContent = hm_generateHotelCardHtml(data[0]);
    } else {
        bodyContent = '<h1 style="text-align: center;">?쒖떆???명뀛 ?뺣낫媛 ?놁뒿?덈떎.</h1>';
    }

    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>?명뀛 ?덈궡: ${hotelName}</title>${sliderHead}<style>body{font-family:'Malgun Gothic',sans-serif;background-color:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:2rem;box-sizing:border-box;margin:0;}.swiper-slide{display:flex;justify-content:center;align-items:center;}</style></head><body>${bodyContent}${sliderBodyScript}</body></html>`;
}

// =======================================================================
// ?꿎뼯??4. ?명뀛移대뱶 硫붿씠而?(Hotel Maker) ?듯빀 肄붾뱶 ???꿎뼯??
// =======================================================================
// =======================================================================
// 5. ?곸꽭 ?쇱젙??(Itinerary Planner) ?듯빀 肄붾뱶
// =======================================================================
const ipFirebaseConfig = {
  apiKey: "AIzaSyAGULxdnWWnSc5eMCsqHeKGK9tmyHsxlv0",
  authDomain: "trip-planner-app-cc72c.firebaseapp.com",
  projectId: "trip-planner-app-cc72c",
  storageBucket: "trip-planner-app-cc72c.appspot.com",
  messagingSenderId: "1063594141232",
  appId: "1:1063594141232:web:1dbba9b9722b20ff602ff5",
  measurementId: "G-2G3Z6WMLF6"
};
const ipFbApp = firebase.initializeApp(ipFirebaseConfig, 'itineraryPlannerApp');
const ipDb = firebase.firestore(ipFbApp);

const ip_travelEmojis = [
    { value: "", display: "?꾩씠肄??놁쓬" }, { value: "?뭷?뤋", display: "?뭷?뤋 留덉궗吏" }, { value: "?덌툘", display: "?덌툘 ??났" }, { value: "?룳", display: "?룳 ?숈냼" }, { value: "?띂截?, display: "?띂截??앹궗" }, { value: "?룢截?, display: "?룢截?愿愿??ㅻ궡)" }, { value: "?룥截?, display: "?룥截?愿愿??쇱쇅)" }, { value: "?슯", display: "?슯 ?대룞(?꾨낫)" }, { value: "?쉶", display: "?쉶 ?대룞(踰꾩뒪)" }, { value: "?쉮", display: "?쉮 ?대룞(湲곗감)" }, { value: "?슓", display: "?슓 ?대룞(諛?" }, { value: "?슃", display: "?슃 ?대룞(?앹떆)" }, { value: "?썚截?, display: "?썚截??쇳븨" }, { value: "?벜", display: "?벜 ?ъ쭊珥ъ쁺" }, { value: "?뿺截?, display: "?뿺截?怨꾪쉷/吏?? }, { value: "?뱦", display: "?뱦 以묒슂?μ냼" }, { value: "??, display: "??移댄럹/?댁떇" }, { value: "?렚", display: "?렚 怨듭뿰/臾명솕" }, { value: "?뮳", display: "?뮳 ?낅Т" }, { value: "?뱄툘", display: "?뱄툘 ?뺣낫" }
];
const ip_editIconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
const ip_saveIconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
const ip_cancelIconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
const ip_deleteIconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
const ip_duplicateIconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
const ip_syncFromDbIconSVG = `<svg fill="none" class="w-4 h-4" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`;
let ipPendingNewActivityGroupId = null;
let ipPendingNewActivityDayIndex = null;
let ipPendingSyncActivityIndex = null;
let ipAllFetchedAttractions = [];

function ip_generateId() { return 'id_' + Math.random().toString(36).substr(2, 9); }
function dateToYyyyMmDd(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1); let dayVal = '' + d.getDate(); const year = d.getFullYear();
    if (month.length < 2) month = '0' + month; if (dayVal.length < 2) dayVal = '0' + dayVal;
    return [year, month, dayVal].join('-');
}
function ip_formatDate(dateString, dayNumber) { return `DAY ${dayNumber}`; }
function ip_formatTimeToHHMM(timeStr) {
    if (timeStr && timeStr.length === 4 && /^\d{4}$/.test(timeStr)) {
        const hours = timeStr.substring(0, 2); const minutes = timeStr.substring(2, 4);
        if (parseInt(hours, 10) >= 0 && parseInt(hours, 10) <= 23 && parseInt(minutes, 10) >= 0 && parseInt(minutes, 10) <= 59) return `${hours}:${minutes}`;
    }
    return "";
}
function ip_isValidDateString(dateString) { if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false; const parts = dateString.split("-"); const year = parseInt(parts[0], 10); const month = parseInt(parts[1], 10); const day = parseInt(parts[2], 10); if (year < 1000 || year > 3000 || month === 0 || month > 12) return false; const monthLength = [31, (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; return !(day === 0 || day > monthLength[month - 1]); }
function ip_parseAndValidateDateInput(inputValue) { let dateStr = inputValue.trim(); if (/^\d{8}$/.test(dateStr)) { dateStr = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`; } else if (/^\d{6}$/.test(dateStr)) { const currentYearPrefix = new Date().getFullYear().toString().substring(0, 2); dateStr = `${currentYearPrefix}${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`; } else if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(dateStr)) { dateStr = dateStr.replace(/[./]/g, '-'); } return ip_isValidDateString(dateStr) ? dateStr : null; }

function initializeItineraryPlannerForGroup(container, groupId) {
    container.innerHTML = `
        <header class="ip-header sticky top-0 z-10 py-3 px-4 -mx-4 mb-4 bg-white/80 backdrop-blur-sm">
            <div class="flex justify-between items-center h-[50px]">
                <div id="ip-headerTitleSection-${groupId}" class="ip-header-title-container"></div>
                <div class="flex items-center space-x-2">
                    <button id="ip-copyInlineHtmlButton-${groupId}" class="btn btn-sm btn-outline" title="?쇱젙??肄붾뱶 蹂듭궗"><i class="fas fa-copy"></i> 肄붾뱶 蹂듭궗</button>
                    <button id="ip-inlinePreviewButton-${groupId}" class="btn btn-sm btn-outline" title="?몃씪???뺤떇 誘몃━蹂닿린"><i class="fas fa-eye"></i> 誘몃━蹂닿린</button>
                    <button id="ip-loadFromDBBtn-${groupId}" class="btn btn-sm btn-green" title="DB?먯꽌 ?쇱젙 遺덈윭?ㅺ린"><i class="fas fa-database"></i><span class="inline ml-2">DB 遺덈윭?ㅺ린</span></button>
                </div>
            </div>
        </header>
        <main class="ip-main-content">
            <div id="ip-daysContainer-${groupId}" class="space-y-4"></div>
            <div class="add-day-button-container mt-6 text-center">
                <button id="ip-addDayButton-${groupId}" class="btn btn-indigo"><i class="fas fa-plus mr-2"></i>???좎쭨 異붽?</button>
            </div>
        </main>
    `;
    ip_render(groupId);
}

function ip_render(groupId) {
    console.log(`?쇱젙 ?뚮뜑留??쒖옉: ${groupId}`);
    const container = document.getElementById(`itinerary-planner-container-${groupId}`);
    if (!container) {
        console.error(`?쇱젙 而⑦뀒?대꼫瑜?李얠쓣 ???놁뒿?덈떎: itinerary-planner-container-${groupId}`);
        return;
    }
    ip_renderHeaderTitle(groupId, container);
    ip_renderDays(groupId, container);
    console.log(`?쇱젙 ?뚮뜑留??꾨즺: ${groupId}`);
}
function ip_getSortableIndex(evt, primaryKey, fallbackKey) {
    const primaryValue = evt[primaryKey];
    if (Number.isInteger(primaryValue)) return primaryValue;
    const fallbackValue = evt[fallbackKey];
    return Number.isInteger(fallbackValue) ? fallbackValue : null;
}
function ip_getDayIndexFromList(element) {
    if (!element || !element.dataset) return null;
    const dayIndex = parseInt(element.dataset.dayIndex, 10);
    return Number.isInteger(dayIndex) ? dayIndex : null;
}
function ip_renderHeaderTitle(groupId, container) {
    const itineraryData = quoteGroupsData[groupId].itineraryData;
    const headerTitleSection = container.querySelector(`#ip-headerTitleSection-${groupId}`);
    if (!headerTitleSection) return;
    headerTitleSection.innerHTML = '';
    if (itineraryData.editingTitle) {
        const input = document.createElement('input'); input.type = 'text'; input.className = 'ip-header-title-input'; input.value = itineraryData.title;
        const saveButton = document.createElement('button'); saveButton.className = 'icon-button'; saveButton.title = '?쒕ぉ ???; saveButton.innerHTML = ip_saveIconSVG; saveButton.addEventListener('click', () => ip_handleSaveTripTitle(groupId));
        const cancelButton = document.createElement('button'); cancelButton.className = 'icon-button'; cancelButton.title = '痍⑥냼'; cancelButton.innerHTML = ip_cancelIconSVG; cancelButton.addEventListener('click', () => ip_handleCancelTripTitleEdit(groupId));
        headerTitleSection.append(input, saveButton, cancelButton); input.focus();
    } else {
        const titleH1 = document.createElement('h1'); titleH1.className = 'text-2xl font-bold'; titleH1.textContent = itineraryData.title;
        const editButton = document.createElement('button'); editButton.className = 'icon-button ml-2'; editButton.title = '?ы뻾 ?쒕ぉ ?섏젙'; editButton.innerHTML = ip_editIconSVG; editButton.addEventListener('click', () => ip_handleEditTripTitle(groupId));
        headerTitleSection.append(titleH1, editButton);
    }
}
function ip_renderDays(groupId, container) {
    const itineraryData = quoteGroupsData[groupId].itineraryData;
    const daysContainer = container.querySelector(`#ip-daysContainer-${groupId}`);
    daysContainer.innerHTML = '';
    (itineraryData.days || []).forEach((day, dayIndex) => {
        const daySection = document.createElement('div');
        daySection.className = 'ip-day-section day-section'; daySection.dataset.dayId = `day-${dayIndex}`;
        const expandedIcon = `<svg class="toggle-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
        const collapsedIcon = `<svg class="toggle-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
        let dateDisplayHTML = day.editingDate
            ? `<input type="text" class="date-edit-input-text" value="${day.date}" placeholder="YYYY-MM-DD"><button class="save-date-button icon-button" title="?좎쭨 ???>${ip_saveIconSVG}</button><button class="cancel-date-edit-button icon-button" title="痍⑥냼">${ip_cancelIconSVG}</button>`
            : `<h2 class="day-header-title">${ip_formatDate(day.date, dayIndex + 1)}</h2><button class="edit-date-button icon-button ml-2" title="?좎쭨 ?섏젙">${ip_editIconSVG}</button>`;
        daySection.innerHTML = `<div class="ip-day-header-container day-header-container"><div class="ip-day-header-main">${dateDisplayHTML}</div><div class="ip-day-header-controls"><button class="delete-day-button icon-button" title="???좎쭨 ??젣">${ip_deleteIconSVG}</button><button class="day-toggle-button icon-button">${day.isCollapsed ? collapsedIcon : expandedIcon}</button></div></div><div class="day-content-wrapper ${day.isCollapsed ? 'hidden' : ''}"><div class="activities-list ip-activities-list pt-4" data-day-index="${dayIndex}"></div><button class="add-activity-button mt-4 ml-2 btn btn-sm btn-outline"><i class="fas fa-plus mr-1"></i>?쇱젙 異붽?</button></div>`;
        daysContainer.appendChild(daySection);
        const activitiesList = daySection.querySelector('.activities-list');
        ip_renderActivities(activitiesList, day.activities, dayIndex, groupId);
    });
    if (typeof Sortable !== 'undefined') {
        new Sortable(daysContainer, {
            handle: '.ip-day-header-container',
            draggable: '.ip-day-section',
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: 'a,button,input,textarea,select',
            preventOnFilter: false,
            onStart: () => {
                console.log('[itinerary] day drag started', groupId);
            },
            onEnd: (evt) => {
                const oldIndex = ip_getSortableIndex(evt, 'oldDraggableIndex', 'oldIndex');
                const newIndex = ip_getSortableIndex(evt, 'newDraggableIndex', 'newIndex');
                if (oldIndex === null || newIndex === null || oldIndex === newIndex) return;
                const itineraryData = quoteGroupsData[groupId].itineraryData;
                const movedDay = itineraryData.days.splice(oldIndex, 1)[0];
                if (!movedDay) return;
                itineraryData.days.splice(newIndex, 0, movedDay);
                ip_recalculateAllDates(groupId);
                ip_render(groupId);
            }
        });
        daysContainer.querySelectorAll('.activities-list').forEach(list => {
            new Sortable(list, {
                group: `shared-activities-${groupId}`,
                handle: '.ip-activity-card',
                draggable: '.ip-activity-card',
                animation: 150,
                ghostClass: 'sortable-ghost',
                filter: 'a,button,input,textarea,select',
                preventOnFilter: false,
                onStart: () => {
                    console.log('[itinerary] activity drag started', groupId);
                },
                onEnd: (evt) => {
                    const fromDayIndex = ip_getDayIndexFromList(evt.from);
                    const toDayIndex = ip_getDayIndexFromList(evt.to);
                    const oldActivityIndex = ip_getSortableIndex(evt, 'oldDraggableIndex', 'oldIndex');
                    const newActivityIndex = ip_getSortableIndex(evt, 'newDraggableIndex', 'newIndex');
                    if (fromDayIndex === null || toDayIndex === null || oldActivityIndex === null || newActivityIndex === null) return;
                    const itineraryData = quoteGroupsData[groupId].itineraryData;
                    if (!itineraryData.days[fromDayIndex] || !itineraryData.days[toDayIndex]) return;
                    const movedActivity = itineraryData.days[fromDayIndex].activities.splice(oldActivityIndex, 1)[0];
                    if (!movedActivity) return;
                    itineraryData.days[toDayIndex].activities.splice(newActivityIndex, 0, movedActivity);
                    ip_render(groupId);
                }
            });
        });
    } else {
        console.error('[itinerary] Sortable is undefined - drag-and-drop disabled');
    }
}

function reinitializeItineraryDragAndDrop(rootElement) {
    if (!rootElement) return;
    const itineraryContainers = rootElement.querySelectorAll('[id^="itinerary-planner-container-"]');
    itineraryContainers.forEach((container) => {
        const groupId = container.id.replace('itinerary-planner-container-', '');
        if (quoteGroupsData[groupId] && quoteGroupsData[groupId].itineraryData) {
            ip_render(groupId);
            console.log('[itinerary] drag and drop reinitialized:', groupId);
        }
    });
}
function ip_renderActivities(activitiesListElement, activities, dayIndex, groupId) {
    activitiesListElement.innerHTML = '';
    (activities || []).forEach((activity, activityIndex) => {
        const card = document.createElement('div'); card.className = 'ip-activity-card activity-card';
        card.dataset.activityId = activity.id; card.dataset.dayIndex = dayIndex; card.dataset.activityIndex = activityIndex;
        let imageHTML = activity.imageUrl ? `<img src="${activity.imageUrl}" alt="${activity.title}" class="ip-card-image card-image" onerror="this.style.display='none';">` : '';
        const descHTML = activity.description ? `<div class="card-description">${activity.description.replace(/\n/g, '<br>')}</div>` : '';
        let locationText = activity.locationLink;
        if (locationText && locationText.length > 35) { locationText = locationText.substring(0, 32) + '...'; }
        const locHTML = activity.locationLink ? `<div class="card-location">?뱧 <a href="${activity.locationLink}" target="_blank" title="${activity.locationLink}">${locationText}</a></div>` : '';
        const costHTML = activity.cost ? `<div class="card-cost">?뮥 ${activity.cost}</div>` : '';
        const notesHTML = activity.notes ? `<div class="card-notes">?뱷 ${activity.notes.replace(/\n/g, '<br>')}</div>` : '';
        card.innerHTML = `<div class="card-time-icon-area"><div class="card-icon">${activity.icon||'&nbsp;'}</div><div class="card-time" data-time-value="${activity.time||''}">${ip_formatTimeToHHMM(activity.time)}</div></div><div class="card-details-area"><div class="card-title">${activity.title||''}</div>${descHTML}${imageHTML}${locHTML}${costHTML}${notesHTML}</div><div class="card-actions-direct"><button class="icon-button card-action-icon-button sync-activity-from-db-button" title="愿愿묒? DB 理쒖떊 ?뺣낫濡???뼱?곌린">${ip_syncFromDbIconSVG}</button><button class="icon-button card-action-icon-button edit-activity-button" title="?섏젙">${ip_editIconSVG}</button><button class="icon-button card-action-icon-button duplicate-activity-button" title="蹂듭젣">${ip_duplicateIconSVG}</button><button class="icon-button card-action-icon-button delete-activity-button" title="??젣">${ip_deleteIconSVG}</button></div>`;
        
        // 카드 액션 버튼 이벤트를 카드 렌더 시점에 직접 바인딩
        const deleteBtn = card.querySelector('.delete-activity-button');
        const syncBtn = card.querySelector('.sync-activity-from-db-button');
        const editBtn = card.querySelector('.edit-activity-button');
        const duplicateBtn = card.querySelector('.duplicate-activity-button');

        if (syncBtn) {
            syncBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ip_openSyncActivityFromDbModal(groupId, dayIndex, activityIndex);
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ip_openActivityModal(groupId, dayIndex, activityIndex);
            });
        }

        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ip_handleDuplicateActivity(groupId, dayIndex, activityIndex);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ip_handleDeleteActivity(groupId, parseInt(dayIndex), parseInt(activityIndex));
            });
        }
        
        activitiesListElement.appendChild(card);
    });
}

function ip_addDay(groupId) {
    const itineraryData = quoteGroupsData[groupId].itineraryData; let newDate;
    if (itineraryData.days.length > 0) { const lastDate = new Date(itineraryData.days[itineraryData.days.length - 1].date + "T00:00:00Z"); newDate = new Date(lastDate.setDate(lastDate.getDate() + 1)); } else { newDate = new Date(); }
    itineraryData.days.push({ date: dateToYyyyMmDd(newDate), activities: [], isCollapsed: false, editingDate: false });
    ip_render(groupId);
}
function ip_handleDeleteActivity(groupId, dayIndex, activityIndex) { if (confirm('이 일정을 삭제하시겠습니까?')) { quoteGroupsData[groupId].itineraryData.days[dayIndex].activities.splice(activityIndex, 1); ip_render(groupId); } }
function ip_handleDuplicateActivity(groupId, dayIndex, activityIndex) {
    const itineraryData = quoteGroupsData[groupId].itineraryData;
    const activityToDuplicate = itineraryData.days[dayIndex].activities[activityIndex];
    if (activityToDuplicate) { const newActivity = JSON.parse(JSON.stringify(activityToDuplicate)); newActivity.id = ip_generateId(); newActivity.title = `${newActivity.title} (蹂듭궗蹂?`; itineraryData.days[dayIndex].activities.splice(activityIndex + 1, 0, newActivity); ip_render(groupId); }
}
function ip_handleEditTripTitle(groupId) { quoteGroupsData[groupId].itineraryData.editingTitle = true; ip_render(groupId); }
function ip_handleSaveTripTitle(groupId) { const container = document.getElementById(`itinerary-planner-container-${groupId}`); const input = container.querySelector(`#ip-headerTitleSection-${groupId} input`); quoteGroupsData[groupId].itineraryData.title = input.value; quoteGroupsData[groupId].itineraryData.editingTitle = false; ip_render(groupId); }
function ip_handleCancelTripTitleEdit(groupId) { quoteGroupsData[groupId].itineraryData.editingTitle = false; ip_render(groupId); }
function ip_handleEditDate(dayIndex, groupId) { quoteGroupsData[groupId].itineraryData.days.forEach((day, index) => { day.editingDate = (index === dayIndex); }); ip_render(groupId); }
function ip_handleSaveDate(dayIndex, groupId, dateValue) {
    const validatedDate = ip_parseAndValidateDateInput(dateValue);
    if (validatedDate) {
        quoteGroupsData[groupId].itineraryData.days[dayIndex].date = validatedDate;
        quoteGroupsData[groupId].itineraryData.days[dayIndex].editingDate = false;
        ip_recalculateAllDates(groupId); ip_render(groupId);
    } else { showToastMessage("?섎せ???좎쭨 ?뺤떇?낅땲?? (YYYY-MM-DD)", true); }
}
function ip_handleCancelDateEdit(dayIndex, groupId) { quoteGroupsData[groupId].itineraryData.days[dayIndex].editingDate = false; ip_render(groupId); }
function ip_handleToggleDayCollapse(event, dayIndex, groupId) {
    const day = quoteGroupsData[groupId].itineraryData.days[dayIndex]; if (day.editingDate) return; day.isCollapsed = !day.isCollapsed; ip_render(groupId);
}
function ip_handleActivityDoubleClick(event, groupId) {
    const card = event.target.closest('.ip-activity-card');
    if (card) { ip_openActivityModal(groupId, parseInt(card.dataset.dayIndex), parseInt(card.dataset.activityIndex)); }
}

function ip_resetPendingAddActivityState() {
    ipPendingNewActivityGroupId = null;
    ipPendingNewActivityDayIndex = null;
    ipPendingSyncActivityIndex = null;
}

function ip_openAddActivityChoiceModal(groupId, dayIndex) {
    ipPendingNewActivityGroupId = groupId;
    ipPendingNewActivityDayIndex = parseInt(dayIndex, 10);
    ipPendingSyncActivityIndex = null;
    const modal = document.getElementById('ipAddActivityChoiceModal');
    if (modal) modal.classList.remove('hidden');
}

function ip_closeAddActivityChoiceModal() {
    const modal = document.getElementById('ipAddActivityChoiceModal');
    if (modal) modal.classList.add('hidden');
}

function ip_openBlankActivityModal(groupId, dayIndex) {
    ip_openActivityModal(groupId, dayIndex, -1);
}

function ip_openSyncActivityFromDbModal(groupId, dayIndex, activityIndex) {
    ipPendingNewActivityGroupId = groupId;
    ipPendingNewActivityDayIndex = parseInt(dayIndex, 10);
    ipPendingSyncActivityIndex = parseInt(activityIndex, 10);
    ip_loadAttractionListFromFirestore();
}

function ip_closeLoadAttractionModal() {
    const modal = document.getElementById('ipLoadAttractionModal');
    if (modal) modal.classList.add('hidden');
}

function ip_addActivityFromAttraction(attraction) {
    const groupId = ipPendingNewActivityGroupId;
    const dayIndex = ipPendingNewActivityDayIndex;
    if (!groupId || !Number.isInteger(dayIndex)) {
        showToastMessage('?쇱젙??異붽???????좎쭨瑜?李얠쓣 ???놁뒿?덈떎.', true);
        return;
    }
    const day = quoteGroupsData[groupId]?.itineraryData?.days?.[dayIndex];
    if (!day) {
        showToastMessage('?좏깮???좎쭨 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎.', true);
        ip_resetPendingAddActivityState();
        return;
    }

    if (Number.isInteger(ipPendingSyncActivityIndex)) {
        const targetActivity = day.activities[ipPendingSyncActivityIndex];
        if (!targetActivity) {
            showToastMessage('?숆린?뷀븷 湲곗〈 ?쇱젙??李얠? 紐삵뻽?듬땲??', true);
            ip_resetPendingAddActivityState();
            return;
        }

        targetActivity.icon = attraction.icon || '';
        targetActivity.title = attraction.title || '';
        targetActivity.description = attraction.description || '';
        targetActivity.locationLink = attraction.locationLink || attraction.location || '';
        targetActivity.imageUrl = attraction.imageUrl || '';
        targetActivity.cost = attraction.cost || '';
        targetActivity.notes = attraction.notes || '';

        ip_render(groupId);
        ip_closeLoadAttractionModal();
        showToastMessage(`DAY ${dayIndex + 1} ?쇱젙??"${attraction.title || '愿愿묒? ?뺣낫'}"濡??숆린?뷀뻽?듬땲??`);
        ip_resetPendingAddActivityState();
        return;
    }

    day.activities.push({
        id: ip_generateId(),
        time: '',
        icon: attraction.icon || '',
        title: attraction.title || '',
        description: attraction.description || '',
        locationLink: attraction.locationLink || attraction.location || '',
        imageUrl: attraction.imageUrl || '',
        cost: attraction.cost || '',
        notes: attraction.notes || ''
    });

    ip_render(groupId);
    showToastMessage(`"${attraction.title || '???쇱젙'}" ??ぉ??DAY ${dayIndex + 1}??異붽??덉뒿?덈떎.`);
}

function ip_renderFilteredAttractionList() {
    const listEl = document.getElementById('ipAttractionList');
    const searchInput = document.getElementById('ipAttractionSearchInput');
    const loadingMsg = document.getElementById('ipLoadingAttractionMsg');
    if (!listEl || !searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    listEl.innerHTML = '';

    const filteredAttractions = ipAllFetchedAttractions.filter((attraction) =>
        (attraction.title || '').toLowerCase().includes(searchTerm)
    );

    if (filteredAttractions.length === 0) {
        const isLoading = loadingMsg && loadingMsg.style.display !== 'none';
        if (!isLoading) {
            if (searchTerm) {
                listEl.innerHTML = `<li class="p-2 text-gray-500">"${searchTerm}" 寃??寃곌낵媛 ?놁뒿?덈떎.</li>`;
            } else {
                listEl.innerHTML = '<li class="p-2 text-gray-500">?깅줉??愿愿묒? ?곗씠?곌? ?놁뒿?덈떎.</li>';
            }
        }
        return;
    }

    filteredAttractions.forEach((attraction) => {
        const li = document.createElement('li');
        li.className = 'p-3 hover:bg-gray-100 cursor-pointer';
        li.innerHTML = `
            <div class="font-medium flex items-center gap-2">
                <span>${attraction.icon || ''}</span>
                <span>${attraction.title || '(?쒕ぉ ?놁쓬)'}</span>
            </div>
            ${attraction.description ? `<div class="text-xs text-gray-500 mt-1">${attraction.description}</div>` : ''}
        `;
        li.addEventListener('click', () => ip_addActivityFromAttraction(attraction));
        listEl.appendChild(li);
    });
}

async function ip_loadAttractionListFromFirestore() {
    const modal = document.getElementById('ipLoadAttractionModal');
    const listEl = document.getElementById('ipAttractionList');
    const loadingMsg = document.getElementById('ipLoadingAttractionMsg');
    const searchInput = document.getElementById('ipAttractionSearchInput');
    if (!modal || !listEl || !loadingMsg || !searchInput) {
        showToastMessage('愿愿묒? DB 遺덈윭?ㅺ린 UI瑜?李얠쓣 ???놁뒿?덈떎.', true);
        return;
    }

    modal.classList.remove('hidden');
    loadingMsg.style.display = 'block';
    listEl.innerHTML = '';
    searchInput.value = '';
    ipAllFetchedAttractions = [];

    try {
        const querySnapshot = await ipDb.collection('attractions').orderBy('title').get();
        querySnapshot.forEach((doc) => {
            ipAllFetchedAttractions.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('[itinerary] 愿愿묒? 紐⑸줉 濡쒕뱶 ?ㅽ뙣:', error);
        showToastMessage('愿愿묒? DB 紐⑸줉 遺덈윭?ㅺ린 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', true);
    } finally {
        loadingMsg.style.display = 'none';
        ip_renderFilteredAttractionList();
    }
}

function ip_openActivityModal(groupId, dayIndex, activityIndex = -1) {
    const modal = document.getElementById('ipActivityModal'); const form = document.getElementById('ipActivityForm');
    modal.querySelector('#ipModalTitle').textContent = activityIndex > -1 ? '?쇱젙 ?섏젙' : '???쇱젙 異붽?';
    form.reset();
    form.querySelector('#ipActivityDayIndex').value = dayIndex; form.querySelector('#ipActivityIndex').value = activityIndex; form.querySelector('#ipGroupId').value = groupId;
    const activityIconSelect = document.getElementById('ipActivityIconSelect');
    activityIconSelect.innerHTML = ip_travelEmojis.map(emoji => `<option value="${emoji.value}">${emoji.display}</option>`).join('');
    if (activityIndex > -1) {
        const activity = quoteGroupsData[groupId].itineraryData.days[dayIndex].activities[activityIndex];
        if (!activity) {
            showToastMessage('?섏젙???쇱젙 ?곗씠?곕? 李얠쓣 ???놁뒿?덈떎.', true);
            return;
        }

        const setValue = (selector, value) => {
            const field = form.querySelector(selector);
            if (field) field.value = value ?? '';
        };

        setValue('#ipActivityTimeInput', activity.time);
        setValue('#ipActivityTitle', activity.title);
        setValue('#ipActivityDescription', activity.description);
        setValue('#ipActivityLocation', activity.locationLink);
        setValue('#ipActivityImageUrl', activity.imageUrl);
        setValue('#ipActivityCost', activity.cost);
        setValue('#ipActivityNotes', activity.notes);
        activityIconSelect.value = activity.icon ?? '';
    }
    modal.classList.remove('hidden');
}
function ip_handleActivityFormSubmit(event) {
    event.preventDefault(); const form = event.target;
    const groupId = form.querySelector('#ipGroupId').value; const dayIndex = parseInt(form.querySelector('#ipActivityDayIndex').value); const activityIndex = parseInt(form.querySelector('#ipActivityIndex').value);
    let timeValue = form.querySelector('#ipActivityTimeInput').value.trim();
    if (timeValue && (timeValue.length !== 4 || !/^\d{4}$/.test(timeValue))) { showToastMessage("?쒓컙? HHMM ?뺤떇??4?먮━ ?レ옄濡??낅젰?섏꽭??", true); return; }
    const itineraryData = quoteGroupsData[groupId].itineraryData;
    const activityData = {
        id: (activityIndex > -1 ? itineraryData.days[dayIndex].activities[activityIndex].id : ip_generateId()),
        time: timeValue, icon: form.querySelector('#ipActivityIconSelect').value, title: form.querySelector('#ipActivityTitle').value,
        description: form.querySelector('#ipActivityDescription').value, locationLink: form.querySelector('#ipActivityLocation').value,
        imageUrl: form.querySelector('#ipActivityImageUrl').value, cost: form.querySelector('#ipActivityCost').value, notes: form.querySelector('#ipActivityNotes').value,
    };
    if (activityIndex > -1) itineraryData.days[dayIndex].activities[activityIndex] = activityData;
    else itineraryData.days[dayIndex].activities.push(activityData);
    document.getElementById('ipActivityModal').classList.add('hidden'); ip_render(groupId);
}
function ip_showConfirmDeleteDayModal(dayIndex, groupId) {
    const modal = document.getElementById('ipConfirmDeleteDayModal');
    modal.querySelector('#ipConfirmDeleteDayMessage').textContent = `DAY ${dayIndex + 1} ?쇱젙???뺣쭚 ??젣?섏떆寃좎뒿?덇퉴?`;
    modal.classList.remove('hidden');
    const confirmBtn = document.getElementById('ipConfirmDeleteDayActionButton');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        quoteGroupsData[groupId].itineraryData.days.splice(dayIndex, 1); ip_recalculateAllDates(groupId); ip_render(groupId); modal.classList.add('hidden');
    }, { once: true });
}

async function ip_handleCopyInlineHtml(groupId) {
    const html = ip_generateInlineStyledHTML(quoteGroupsData[groupId].itineraryData, { 
        includeStyles: false, 
        makePageTitleEmptyForCopy: true 
    });

    try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html], { type: 'text/plain' });
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
        ]);
        showToastMessage('?쇱젙??HTML???대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??');
    } catch (err) {
        console.error("HTML 蹂듭궗 ?ㅽ뙣, ?띿뒪?몃줈 ?ъ떆??", err);
        try {
            await navigator.clipboard.writeText(html);
            showToastMessage('?쇱젙??肄붾뱶媛 ?띿뒪?몃줈 蹂듭궗?섏뿀?듬땲??(HTML ?뺤떇 蹂듭궗 ?ㅽ뙣).');
        } catch (fallbackErr) {
            showToastMessage('?대┰蹂대뱶 蹂듭궗??理쒖쥌?곸쑝濡??ㅽ뙣?덉뒿?덈떎.', true);
        }
    }
}
function ip_handleInlinePreview(groupId) {
    const html = ip_generateInlineStyledHTML(quoteGroupsData[groupId].itineraryData, { includeStyles: true });
    const previewWindow = window.open('', '_blank');
    if (previewWindow) { previewWindow.document.write(html); previewWindow.document.close(); } else { showToastMessage("?앹뾽??李⑤떒?섏뿀?듬땲??", true); }
}

/**
 * [?섏젙?? ?쇱젙??HTML ?앹꽦 ?⑥닔
 * ?꾩쟾??HTML 臾몄꽌媛 ?꾨땶, .txt ?뚯씪 湲곗???<main>...</main> HTML 議곌컖(fragment)???앹꽦?섎룄濡?蹂寃?
 * @param {object} itineraryData - ?쇱젙???곗씠??
 * @param {object} options - ?듭뀡 (?꾩옱 ?ъ슜?섏? ?딆쓬)
 * @returns {string} - <main> 湲곕컲 HTML 議곌컖
 */
function ip_generateInlineStyledHTML(itineraryData, options = {}) {
    let daysHTML = '';
    (itineraryData.days || []).forEach((day, dayIndex) => {
        let activitiesHTML = (day.activities || []).map(activity => {
            const imageHTML = activity.imageUrl ? `
              <details open style="margin-top:8px;">
                <summary style="font-size:12px;color:#007bff;cursor:pointer;display:inline-block;">?뼹截??ъ쭊</summary>
                <img src="${activity.imageUrl}" alt="${activity.title}" style="max-width: 100%; height:auto;border-radius:4px;margin-top:8px;" onerror="this.style.display='none';">
              </details>` : '';
            
            const locationHTML = activity.locationLink ? `<div style="font-size:12px;margin-top:4px;">?뱧 <a href="${activity.locationLink}" target="_blank" rel="noopener noreferrer" style="color:#007bff;text-decoration:none;">?꾩튂 蹂닿린</a></div>` : '';
            const costHTML = activity.cost ? `<div style="font-size:12px;margin-top:4px;">?뮥 ${activity.cost}</div>` : '';
            const notesHTML = activity.notes ? `<div style="font-size:12px;margin-top:4px;white-space:pre-wrap;">?뱷 ${activity.notes.replace(/\n/g, '<br>')}</div>` : '';
            const descHTML = activity.description ? `<div style="font-size:12px;white-space:pre-wrap;">${activity.description.replace(/\n/g, '<br>')}</div>` : '';
            
            return `
          <div style="background-color:white;border-radius:8px;border:1px solid #E0E0E0;padding:10px;margin-bottom:10px;display:flex; align-items: flex-start;">
            <div style="width:50px;flex-shrink:0;margin-right:10px;">
              <div style="font-size:20px;margin-bottom:4px;">${activity.icon || '혻'}</div>
              <div style="font-size:12px;font-weight:bold;white-space:nowrap;">${ip_formatTimeToHHMM(activity.time) || '혻'}</div>
            </div>
            <div style="flex-grow:1; overflow: hidden;">
              <div style="font-size:13px;font-weight:bold;">${activity.title || ''}</div>
              ${descHTML}
              ${imageHTML}
              ${locationHTML}
              ${costHTML}
              ${notesHTML}
            </div>
          </div>`;
        }).join('');

        daysHTML += `
  <div style="margin-bottom: 10px;"> <details ${day.isCollapsed ? '' : 'open'}>
      <summary style="display: flex; align-items: center; padding: 10px 8px; border-bottom: 1px solid #EEE; background-color: #fdfdfd; cursor: pointer;">
        <h2 style="font-size: 14px; font-weight: 600; margin:0;">${ip_formatDate(day.date, dayIndex + 1)}</h2>
      </summary>
      <div style="padding: 5px;"> <div style="padding-top: 0.5rem;">
          ${activitiesHTML || '<p style="font-size:12px;color:#777;">?쇱젙???놁뒿?덈떎.</p>'}
        </div>
      </div>
    </details>
  </div>`;
    });

    // .txt ?뚯씪 ?뺤떇??留욎떠 <main>怨?<header> ?쒓렇濡?媛먯떥吏?HTML 議곌컖??諛섑솚?⑸땲??
    // [?섏젙] main ?쒓렇??padding: 0 16px -> 0 ?쇰줈 蹂寃쏀븯???꾩껜 而⑦뀒?대꼫 ?щ갚 ?쒓굅
    return `
<main style="max-width: 750px; margin: auto; padding: 0; font-family: 'Malgun Gothic', '留묒? 怨좊뵓', sans-serif;">
  <header style="padding-top: 15px;"> <h1 style="font-size: 24px; font-weight: bold;">${itineraryData.title}</h1>
  </header>
  ${daysHTML}
</main>`;
}


function ip_recalculateAllDates(groupId) {
    const itineraryData = quoteGroupsData[groupId].itineraryData;
    if (itineraryData.days && itineraryData.days.length > 0 && itineraryData.days[0].date) {
        let currentDate = new Date(itineraryData.days[0].date + "T00:00:00Z");
        for (let i = 0; i < itineraryData.days.length; i++) {
            itineraryData.days[i].date = dateToYyyyMmDd(currentDate);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
}
async function ip_openLoadTripModal(groupId) {
    const modal = document.getElementById('ipLoadTemplateModal');
    modal.classList.remove('hidden');
    const listEl = modal.querySelector('#ipTemplateList');
    const loadingMsg = modal.querySelector('#ipLoadingTemplateMsg');
    const searchInput = modal.querySelector('#ipTemplateSearchInput');
    listEl.innerHTML = ''; loadingMsg.style.display = 'block'; searchInput.value = '';
    try {
        const querySnapshot = await ipDb.collection("tripplan").orderBy("title").get();
        const templates = [];
        querySnapshot.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
        loadingMsg.style.display = 'none';
        
        const renderList = (sets) => {
            listEl.innerHTML = sets.length ? '' : '<li class="p-3 text-center text-gray-500">?쒗뵆由우씠 ?놁뒿?덈떎.</li>';
            sets.forEach(template => {
                const li = document.createElement('li');
                li.className = 'p-3 hover:bg-gray-100 cursor-pointer';
                li.textContent = template.title;
                li.onclick = () => {
                    if (confirm(`'${template.title}' ?쇱젙???꾩옱 寃ъ쟻??遺덈윭?ㅼ떆寃좎뒿?덇퉴?\n(湲곗〈 ?쇱젙? 紐⑤몢 援먯껜?⑸땲??)`)) {
                        ip_loadTripFromFirestore(template.id, groupId);
                        modal.classList.add('hidden');
                    }
                };
                listEl.appendChild(li);
            });
        };
        
        searchInput.oninput = () => renderList(templates.filter(t => t.title.toLowerCase().includes(searchInput.value.toLowerCase())));
        renderList(templates);

    } catch (error) { loadingMsg.textContent = "?쒗뵆由?紐⑸줉 濡쒕뵫 ?ㅽ뙣"; showToastMessage("?쒗뵆由?濡쒕뵫 以??ㅻ쪟 諛쒖깮", true); }
}
async function ip_loadTripFromFirestore(tripId, groupId) {
    try {
        const doc = await ipDb.collection("tripplan").doc(tripId).get();
        if (doc.exists) {
            const loadedData = doc.data();
            quoteGroupsData[groupId].itineraryData = {
                title: loadedData.title || "?쒕ぉ ?놁쓬",
                days: (loadedData.days || []).map((day, index) => ({...day, editingDate: false, isCollapsed: index !== 0 })),
                editingTitle: false
            };
            showToastMessage(`'${loadedData.title}' ?쇱젙??遺덈윭?붿뒿?덈떎.`);
            ip_render(groupId);
            
            // ?쇱젙 遺덈윭?????대깽??由ъ뒪???щ컮?몃뵫
            console.log('?쇱젙 濡쒕뵫 ???대깽??由ъ뒪???щ컮?몃뵫 以?..');
            rebindWorkspaceEventListeners();
            console.log('?쇱젙 濡쒕뵫 ???대깽??由ъ뒪???щ컮?몃뵫 ?꾨즺');
        } else { showToastMessage("?좏깮???쇱젙??李얠쓣 ???놁뒿?덈떎.", true); }
    } catch(error) { showToastMessage("?쇱젙 遺덈윭?ㅺ린 以??ㅻ쪟 諛쒖깮", true); console.error(error); }
}

// =======================================================================
// 6. ?듭떖 湲곕뒫 ?⑥닔 (硫붿씤 ???⑥닔??
// =======================================================================
function createCustomerCard(initialData = { name: '', phone: '', email: '' }) {
    const container = document.getElementById('customerInfoContainer');
    if (!container) return;
    const cardId = `customer_${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'p-4 border border-gray-200 rounded-lg relative flex-grow sm:flex-grow-0 sm:min-w-[300px]';
    card.id = cardId;
    card.innerHTML = `<button type="button" class="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xs remove-customer-btn p-1" title="怨좉컼 ??젣"><i class="fas fa-times"></i></button><div class="space-y-3 text-sm"><div class="flex items-center gap-2"><label for="customerName_${cardId}" class="font-medium text-gray-800 w-12 text-left flex-shrink-0">怨좉컼紐?/label><input type="text" id="customerName_${cardId}" class="w-full flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm" data-field="name" value="${initialData.name}"><button type="button" class="inline-copy-btn copy-customer-info-btn" title="怨좉컼紐?蹂듭궗"><i class="far fa-copy"></i></button></div><div class="flex items-center gap-2"><label for="customerPhone_${cardId}" class="font-medium text-gray-800 w-12 text-left flex-shrink-0">?곕씫泥?/label><input type="tel" id="customerPhone_${cardId}" class="w-full flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm" data-field="phone" value="${initialData.phone}"><button type="button" class="inline-copy-btn copy-customer-info-btn" title="?곕씫泥?蹂듭궗"><i class="far fa-copy"></i></button></div><div class="flex items-center gap-2"><label for="customerEmail_${cardId}" class="font-medium text-gray-800 w-12 text-left flex-shrink-0">?대찓??/label><input type="email" id="customerEmail_${cardId}" class="w-full flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm" data-field="email" value="${initialData.email}"><button type="button" class="inline-copy-btn copy-customer-info-btn" title="?대찓??蹂듭궗"><i class="far fa-copy"></i></button></div></div>`;
    container.appendChild(card);
}
function getCustomerData() {
    const customers = [];
    const container = document.getElementById('customerInfoContainer');
    if (container) {
        container.querySelectorAll('.p-4').forEach(card => {
            const nameInput = card.querySelector('[data-field="name"]');
            const phoneInput = card.querySelector('[data-field="phone"]');
            const emailInput = card.querySelector('[data-field="email"]');
            if (nameInput && (nameInput.value.trim() || phoneInput.value.trim() || emailInput.value.trim())) {
                customers.push({ name: nameInput.value, phone: phoneInput.value, email: emailInput.value });
            }
        });
    }
    return customers;
}

const evaluateMath = (expression) => { 
    if (typeof expression !== 'string' || !expression) return 0; 
    const formula = expression.startsWith('=') ? expression.substring(1) : expression;
    const s = formula.replace(/,/g, ''); 
    if (!/^[0-9+\-*/().\s]+$/.test(s)) { 
        return parseFloat(s) || 0; 
    } 
    try { 
        return new Function('return ' + s)(); 
    } catch (e) { 
        return parseFloat(s) || 0; 
    } 
};
const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + ' ??;
const formatPercentage = (value) => (isNaN(value) || !isFinite(value) ? 0 : value * 100).toFixed(2) + ' %';
const copyHtmlToClipboard = (htmlString) => {
    if (!htmlString || htmlString.trim() === "") { showToastMessage('蹂듭궗???댁슜???놁뒿?덈떎.', true); return; }
    navigator.clipboard.writeText(htmlString).then(() => showToastMessage('HTML ?뚯뒪 肄붾뱶媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??'))
    .catch(err => { console.error('?대┰蹂대뱶 蹂듭궗 ?ㅽ뙣:', err); showToastMessage('蹂듭궗???ㅽ뙣?덉뒿?덈떎.', true); });
};
function copyToClipboard(text, fieldName = '?띿뒪??) {
    if (!text || text.trim() === "") { showToastMessage('蹂듭궗???댁슜???놁뒿?덈떎.', true); return; }
    navigator.clipboard.writeText(text).then(() => {
        showToastMessage(`'${text}' (${fieldName}) ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??`);
    }).catch(err => { console.error('?대┰蹂대뱶 蹂듭궗 ?ㅽ뙣:', err); showToastMessage('蹂듭궗???ㅽ뙣?덉뒿?덈떎.', true); });
}
function showToastMessage(message, isError = false) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `p-3 mb-2 rounded-md shadow-lg text-white text-sm opacity-0 transition-opacity duration-300 transform translate-y-4`;
    toast.style.backgroundColor = isError ? '#dc2626' : '#10B981';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-4');
        toast.classList.add('opacity-100', 'translate-y-0');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-4');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

function syncGroupUIToData(groupId) {
    const quoteGroupsData = getCurrentQuoteGroups();
    if (!groupId || !quoteGroupsData[groupId]) return;
    const groupEl = document.getElementById(`group-content-${groupId}`);
    if (!groupEl) return;
    const groupData = quoteGroupsData[groupId];

    // 怨꾩궛湲??곗씠???숆린??
    groupEl.querySelectorAll('.calculator-instance').forEach(instance => {
        const calcId = instance.dataset.calculatorId;
        const calculatorData = groupData.calculators.find(c => c.id === calcId);
        if (!calculatorData) return;

        const pnrTextarea = instance.querySelector('.pnr-pane textarea');
        if (pnrTextarea) {
            calculatorData.pnr = pnrTextarea.value;
        }

        const table = instance.querySelector('.quote-table');
        if (table) {
            const tableClone = table.cloneNode(true);

            tableClone.querySelectorAll('[data-event-bound]').forEach(el => {
                el.removeAttribute('data-event-bound');
            });
             tableClone.querySelectorAll('[data-dblclick-bound]').forEach(el => {
                el.removeAttribute('data-dblclick-bound');
            });
            
            const originalInputs = table.querySelectorAll('input[type="text"]');
            const clonedInputs = tableClone.querySelectorAll('input[type="text"]');
            originalInputs.forEach((originalInput, index) => {
                if (clonedInputs[index]) {
                    clonedInputs[index].setAttribute('value', originalInput.value);
                }
            });

            calculatorData.tableHTML = tableClone.innerHTML;
        }
    });
    
    // ??났 ?ㅼ?以??곗씠???숆린??
    const flightScheduleContainer = groupEl.querySelector('.flight-schedule-container');
    if (flightScheduleContainer) {
        groupData.flightSchedule = [];
        flightScheduleContainer.querySelectorAll('.flight-schedule-subgroup').forEach(subgroupEl => {
            const newSubgroupData = {
                id: subgroupEl.id,
                title: subgroupEl.querySelector('input[placeholder="??났??]').value,
                rows: []
            };
            subgroupEl.querySelectorAll('tbody tr').forEach(rowEl => {
                const rowData = {};
                rowEl.querySelectorAll('.flight-schedule-cell').forEach(cell => {
                    rowData[cell.dataset.field] = cell.textContent.trim();
                });
                newSubgroupData.rows.push(rowData);
            });
            groupData.flightSchedule.push(newSubgroupData);
        });
    }

    // ?붽툑 ?덈궡 ?곗씠???숆린??
    const priceInfoContainer = groupEl.querySelector('.price-info-container');
    if (priceInfoContainer) {
        groupData.priceInfo = [];
        priceInfoContainer.querySelectorAll('.price-subgroup').forEach(subgroupEl => {
            const newSubgroupData = {
                id: subgroupEl.id,
                title: subgroupEl.querySelector('.price-subgroup-title').value,
                rows: []
            };
            subgroupEl.querySelectorAll('tbody tr').forEach(rowEl => {
                const rowData = {};
                rowEl.querySelectorAll('.price-table-cell').forEach(cell => {
                    rowData[cell.dataset.field] = cell.textContent.trim();
                });
                newSubgroupData.rows.push(rowData);
            });
            groupData.priceInfo.push(newSubgroupData);
        });
    }

    // ?ы븿/遺덊룷???곗씠???숆린??
    const inclusionTextEl = groupEl.querySelector('.inclusion-text');
    if (inclusionTextEl) groupData.inclusionText = inclusionTextEl.value;
    const exclusionTextEl = groupEl.querySelector('.exclusion-text');
    if (exclusionTextEl) groupData.exclusionText = exclusionTextEl.value;

    // ?명뀛 硫붿씠而??숆린??
    hm_syncCurrentHotelData(groupId);
}

async function getSaveDataBlob() {
    if (activeGroupId) {
        syncGroupUIToData(activeGroupId);
    }
    const allData = {
        quoteGroupsData,
        groupCounter,
        activeGroupId,
        memoText: document.getElementById('memoText').value,
        customerInfo: getCustomerData()
    };
    const doc = document.cloneNode(true);
    try {
        const styleResponse = await fetch('./style.css');
        const styleText = await styleResponse.text();
        const scriptResponse = await fetch('./script.js');
        const scriptText = await scriptResponse.text();
        const styleTag = document.createElement('style');
        styleTag.textContent = styleText;
        doc.head.querySelector('link[href="style.css"]')?.replaceWith(styleTag);
        const scriptTag = document.createElement('script');
        scriptTag.textContent = scriptText;
        doc.body.querySelector('script[src="script.js"]')?.replaceWith(scriptTag);
        const dataScriptTag = doc.getElementById('restored-data');
        if (dataScriptTag) { dataScriptTag.textContent = JSON.stringify(allData); }
        return new Blob([doc.documentElement.outerHTML], { type: 'text/html' });
    } catch (error) {
        console.error("CSS ?먮뒗 JS ?뚯씪???ы븿?섎뒗 以??ㅻ쪟 諛쒖깮:", error);
        showToastMessage("???以鍮?以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?몃? ?뚯씪???쎌쓣 ???놁뒿?덈떎.", true);
        return null;
    }
}
async function saveFile(isSaveAs = false, clickedButton = null) {
    const saveBtn = document.getElementById('saveBtn');
    const saveAsBtn = document.getElementById('saveAsBtn');
    const originalBtnHTML = clickedButton ? clickedButton.innerHTML : '';
    saveBtn.disabled = true;
    saveAsBtn.disabled = true;
    if (clickedButton) { clickedButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>???以?..`; }
    try {
        const blob = await getSaveDataBlob();
        if (!blob) throw new Error("Blob ?앹꽦 ?ㅽ뙣");
        
        // ?꾩옱 ?몄뀡???뚯씪 ?몃뱾 ?ъ슜
        const currentSession = getCurrentSession();
        const sessionFileHandle = currentSession ? currentSession.fileHandle : currentFileHandle;
        
        if (isSaveAs || !sessionFileHandle) {
            // ?꾩옱 ?뚯씪紐?媛?몄삤湲?
            let suggestedFileName;
            if (sessionFileHandle && sessionFileHandle.name) {
                // 湲곗〈 ?뚯씪???덉쑝硫?洹??대쫫 ?ъ슜
                suggestedFileName = sessionFileHandle.name;
            } else if (currentSession && currentSession.displayName && currentSession.displayName !== '??寃ъ쟻??) {
                // ?몄뀡???쒖떆紐낆씠 ?덉쑝硫??ъ슜
                suggestedFileName = currentSession.displayName.endsWith('.html') ? 
                    currentSession.displayName : `${currentSession.displayName}.html`;
            } else {
                // 湲곕낯媛?
                suggestedFileName = `寃ъ쟻??${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.html`;
            }
            
            const newHandle = await window.showSaveFilePicker({
                suggestedName: suggestedFileName,
                types: [{ description: 'HTML ?뚯씪', accept: { 'text/html': ['.html'] } }]
            });
            const writableStream = await newHandle.createWritable();
            await writableStream.write(blob);
            await writableStream.close();
            
            // ?몄뀡怨??꾩뿭 ?몃뱾 紐⑤몢 ?낅뜲?댄듃
            if (currentSession) {
                currentSession.fileHandle = newHandle;
                currentSession.displayName = newHandle.name;
                updateFileTabUI(currentSession.fileId);
            }
            currentFileHandle = newHandle;
            document.title = newHandle.name;
            showToastMessage('?뚯씪???깃났?곸쑝濡???λ릺?덉뒿?덈떎.');
            await saveFileHandle(newHandle.name, newHandle);
        } else {
            const writableStream = await sessionFileHandle.createWritable();
            await writableStream.write(blob);
            await writableStream.close();
            showToastMessage('蹂寃쎌궗??씠 ?깃났?곸쑝濡???λ릺?덉뒿?덈떎.');
            await saveFileHandle(sessionFileHandle.name, sessionFileHandle);
        }
    } catch (err) {
        if (err.name !== 'AbortError') { console.error('?뚯씪 ????ㅽ뙣:', err); showToastMessage('?뚯씪 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.', true); }
    } finally {
        saveBtn.disabled = false;
        saveAsBtn.disabled = false;
        if (clickedButton) { clickedButton.innerHTML = originalBtnHTML; }
    }
}
async function loadFile() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'HTML ?뚯씪', accept: { 'text/html': ['.html'] } }] });
        
        // 臾댁“嫄?????뿉???닿린
        await loadFileInNewTab(fileHandle);
    } catch (err) {
        if (err.name !== 'AbortError') { console.error('?뚯씪 ?닿린 ?ㅽ뙣:', err); showToastMessage('?뚯씪???댁? 紐삵뻽?듬땲??', true); }
    }
}

async function loadFileInCurrentTab(fileHandle) {
    try {
        // ?뚯씪 ?쎄린
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(contents, 'text/html');
        const restoredDataScript = doc.getElementById('restored-data');
        
        if (restoredDataScript && restoredDataScript.textContent) {
            // ?꾩옱 ?몄뀡 ?낅뜲?댄듃
            const currentSession = getCurrentSession();
            if (currentSession) {
                // ?뚯씪紐낆뿉???뺤옣???쒓굅?섏뿬 ???대쫫 ?낅뜲?댄듃
                const fileName = fileHandle.name.replace(/\.[^/.]+$/, "");
                currentSession.displayName = fileName;
                currentSession.fileHandle = fileHandle;
                
                // ?뚯씪 ??UI ?낅뜲?댄듃
                const currentTab = document.querySelector(`[data-file-id="${currentFileId}"]`);
                if (currentTab) {
                    const nameSpan = currentTab.querySelector('span');
                    if (nameSpan) {
                        nameSpan.textContent = fileName;
                    }
                }
                
                // ?뚯씪 ?곗씠??蹂듭썝
                try {
                    const restoredData = JSON.parse(restoredDataScript.textContent);
                    
                    // ?꾩옱 ?몄뀡 ?곗씠???낅뜲?댄듃
                    currentSession.quoteGroupsData = restoredData.quoteGroupsData || {};
                    currentSession.groupCounter = restoredData.groupCounter || 0;
                    currentSession.activeGroupId = restoredData.activeGroupId;
                    currentSession.memoText = restoredData.memoText || '';
                    currentSession.customerInfo = restoredData.customerInfo || [];
                    
                    // ?꾩뿭 蹂?섎룄 ?낅뜲?댄듃 (?명솚?깆쓣 ?꾪빐)
                    quoteGroupsData = currentSession.quoteGroupsData;
                    groupCounter = currentSession.groupCounter;
                    activeGroupId = currentSession.activeGroupId;
                    
                    // UI ?곹깭 蹂듭썝
                    currentSession.restoreUIState();
                    
                    showToastMessage(`'${fileName}' ?뚯씪???꾩옱 ??뿉 濡쒕뱶?덉뒿?덈떎.`);
                    
                    // ?뚯씪 ?몃뱾 ???
                    await saveFileHandle(fileHandle.name, fileHandle);
                } catch (e) {
                    console.error("?곗씠???뚯떛 ?ㅽ뙣:", e);
                    showToastMessage("?뚯씪 ?곗씠?곕? 泥섎━?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", true);
                }
            }
        } else {
            showToastMessage('?좏슚???곗씠?곌? ?ы븿??寃ъ쟻???뚯씪???꾨떃?덈떎.', true);
        }
    } catch (err) {
        console.error('?뚯씪 濡쒕뵫 ?ㅽ뙣:', err);
        showToastMessage('?뚯씪???댁? 紐삵뻽?듬땲??', true);
    }
}

async function loadFileInNewTab(fileHandle) {
    try {
        // ?뚯씪 ?쎄린
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(contents, 'text/html');
        const restoredDataScript = doc.getElementById('restored-data');
        
        if (restoredDataScript && restoredDataScript.textContent) {
            // ?뚯씪紐낆뿉???뺤옣???쒓굅
            const fileName = fileHandle.name.replace(/\.[^/.]+$/, "");
            
            // ???뚯씪???앹꽦
            const newFileId = createNewFileTab(fileName);
            
            // ?뚯씪 ?몃뱾 ?곌껐
            const session = filesManager.get(newFileId);
            if (session) {
                session.fileHandle = fileHandle;
            }
            
            // ?뚯씪 ?곗씠??蹂듭썝
            try {
                const restoredData = JSON.parse(restoredDataScript.textContent);
                
                // ?꾩옱 ?몄뀡 ?곗씠???낅뜲?댄듃
                session.quoteGroupsData = restoredData.quoteGroupsData || {};
                session.groupCounter = restoredData.groupCounter || 0;
                session.activeGroupId = restoredData.activeGroupId;
                session.memoText = restoredData.memoText || '';
                session.customerInfo = restoredData.customerInfo || [];
                
                // ?꾩뿭 蹂?섎룄 ?낅뜲?댄듃 (?명솚?깆쓣 ?꾪빐)
                quoteGroupsData = session.quoteGroupsData;
                groupCounter = session.groupCounter;
                activeGroupId = session.activeGroupId;
                
                // ?꾩껜 UI ?곹깭 蹂듭썝 (寃ъ쟻 洹몃９怨??ㅻⅨ履??⑤꼸 ?ы븿)
                restoreState(restoredData);
                
                showToastMessage(`'${fileName}' ?뚯씪??????뿉 濡쒕뱶?덉뒿?덈떎.`);
                
                // ?뚯씪 ?몃뱾 ???
                await saveFileHandle(fileHandle.name, fileHandle);
            } catch (e) {
                console.error("?곗씠???뚯떛 ?ㅽ뙣:", e);
                showToastMessage("?뚯씪 ?곗씠?곕? 泥섎━?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", true);
            }
        } else {
            showToastMessage('?좏슚???곗씠?곌? ?ы븿??寃ъ쟻???뚯씪???꾨떃?덈떎.', true);
        }
    } catch (err) {
        console.error('?뚯씪 濡쒕뵫 ?ㅽ뙣:', err);
        showToastMessage('?뚯씪???댁? 紐삵뻽?듬땲??', true);
    }
}

async function loadDataIntoWindow(fileHandle, openInNewWindow) {
    try {
        if ((await fileHandle.queryPermission({ mode: 'read' })) !== 'granted') {
            if ((await fileHandle.requestPermission({ mode: 'read' })) !== 'granted') {
                showToastMessage('?뚯씪 ?쎄린 沅뚰븳???꾩슂?⑸땲??', true);
                return;
            }
        }
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(contents, 'text/html');
        const restoredDataScript = doc.getElementById('restored-data');
        if (restoredDataScript && restoredDataScript.textContent) {
            const restoredDataJSON = restoredDataScript.textContent;
            if (openInNewWindow) {
                const uniqueKey = `PWA_LOAD_DATA_${Date.now()}`;
                sessionStorage.setItem(uniqueKey, restoredDataJSON);
                const relativeUrl = `?loadDataKey=${uniqueKey}`;
                const newWindow = window.open(relativeUrl, '_blank');
                if (!newWindow) {
                    showToastMessage('?앹뾽??李⑤떒?섏뼱 ??李쎌쓣 ?????놁뒿?덈떎. ?앹뾽 李⑤떒???댁젣?댁＜?몄슂.', true);
                    sessionStorage.removeItem(uniqueKey);
                }
            } else {
                try {
                    const restoredData = JSON.parse(restoredDataJSON);
                    restoreState(restoredData);
                    currentFileHandle = fileHandle;
                    document.title = fileHandle.name;
                    showToastMessage(`'${fileHandle.name}' ?뚯씪???꾩옱 李쎌뿉 濡쒕뱶?덉뒿?덈떎.`);
                } catch (e) {
                    console.error("?곗씠???뚯떛 ?먮뒗 ?곹깭 蹂듭썝 ?ㅽ뙣:", e);
                    showToastMessage("?뚯씪 ?곗씠?곕? 泥섎━?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", true);
                }
            }
        } else {
            showToastMessage('?좏슚???곗씠?곌? ?ы븿??寃ъ쟻???뚯씪???꾨떃?덈떎.', true);
        }
        await saveFileHandle(fileHandle.name, fileHandle);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('?뚯씪 濡쒕뵫 ?ㅽ뙣:', err);
            showToastMessage('?뚯씪???댁? 紐삵뻽?듬땲??', true);
        }
    }
}

let recentFilesModal, recentFileSearchInput, recentFileListUl, loadingRecentFileListMsg, cancelRecentFilesModalButton, closeRecentFilesModalButton;

async function openRecentFilesModal() {
    if (!recentFilesModal || !recentFileListUl || !loadingRecentFileListMsg || !recentFileSearchInput) {
        showToastMessage("理쒓렐 ?뚯씪 遺덈윭?ㅺ린 UI媛 以鍮꾨릺吏 ?딆븯?듬땲??", true); return;
    }
    loadingRecentFileListMsg.style.display = 'block';
    recentFileListUl.innerHTML = '';
    recentFileSearchInput.value = '';
    recentFilesModal.classList.remove('hidden');

    const allHandles = await getAllFileHandles();
    loadingRecentFileListMsg.style.display = 'none';
    renderRecentFileList(allHandles, '');
    recentFileSearchInput.oninput = () => {
        renderRecentFileList(allHandles, recentFileSearchInput.value);
    };
}
function renderRecentFileList(fullList, searchTerm) {
    if (!recentFileListUl) return;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    recentFileListUl.innerHTML = '';
    const filteredList = fullList.filter(item => item.name.toLowerCase().includes(lowerCaseSearchTerm));
    if (filteredList.length > 0) {
        filteredList.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center p-3 hover:bg-gray-100 cursor-pointer';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = item.name;
            titleSpan.className = 'text-sm font-medium text-gray-900 flex-grow';
            titleSpan.title = `"${item.name}" ?뚯씪 諛붾줈 遺덈윭?ㅺ린 (?대┃)`;
            titleSpan.addEventListener('click', async () => {
                try {
                    const handle = await getFileHandle(item.name);
                    if (handle) {
                        // 臾댁“嫄?????뿉???닿린
                        await loadFileInNewTab(handle);
                        recentFilesModal.classList.add('hidden');
                    } else { showToastMessage(`'${item.name}' ?뚯씪 ?몃뱾??李얠쓣 ???놁뒿?덈떎. ?ㅼ떆 ?좏깮?댁＜?몄슂.`, true); }
                } catch (e) { showToastMessage(`?뚯씪 濡쒕뱶 以??ㅻ쪟 諛쒖깮: ${e.message}`, true); }
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg class="w-5 h-5 text-gray-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            deleteButton.className = 'p-1 rounded-full hover:bg-red-100 ml-2';
            deleteButton.title = `"${item.name}" 理쒓렐 ?뚯씪 紐⑸줉?먯꽌 ??젣`;
            deleteButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`'${item.name}'??瑜? 理쒓렐 ?뚯씪 紐⑸줉?먯꽌 ??젣?섏떆寃좎뒿?덇퉴?`)) {
                    await deleteFileHandle(item.name);
                    const allHandles = await getAllFileHandles();
                    renderRecentFileList(allHandles, recentFileSearchInput.value);
                    showToastMessage(`'${item.name}'??媛) 理쒓렐 ?뚯씪 紐⑸줉?먯꽌 ??젣?섏뿀?듬땲??`);
                }
            });
            listItem.appendChild(titleSpan);
            listItem.appendChild(deleteButton);
            recentFileListUl.appendChild(listItem);
        });
    } else {
        recentFileListUl.innerHTML = `<li class="p-3 text-sm text-gray-500 text-center">理쒓렐 ?뚯씪???녾굅?? 寃??寃곌낵媛 ?놁뒿?덈떎.</li>`;
    }
}
function renderFilteredList(options) {
    const { fullList, searchTerm, listElementId, clickHandler, itemTitleField = 'name' } = options;
    const listEl = document.getElementById(listElementId);
    if (!listEl) return;
    listEl.innerHTML = '';
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredList = fullList.filter(item => item[itemTitleField].toLowerCase().includes(lowerCaseSearchTerm));
    if (filteredList.length > 0) {
        filteredList.forEach(item => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-gray-100 cursor-pointer text-sm';
            li.textContent = item[itemTitleField];
            li.addEventListener('click', () => clickHandler(item));
            listEl.appendChild(li);
        });
    } else {
        listEl.innerHTML = '<li class="p-3 text-gray-500 text-sm text-center">寃??寃곌낵媛 ?놁뒿?덈떎.</li>';
    }
}

async function loadAllInclusionDataSets() {
    const dataSets = [];
    try {
        const q = db.collection("inclusionsExclusions").orderBy("timestamp", "desc");
        const querySnapshot = await q.get();
        querySnapshot.forEach((doc) => { dataSets.push({ id: doc.id, ...doc.data() }); });
        return dataSets;
    } catch (error) { console.error("紐⑸줉 遺덈윭?ㅺ린 ?ㅻ쪟:", error); showToastMessage("紐⑸줉??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", true); return []; }
}
async function openLoadInclusionsModal() {
    if (!activeGroupId) { showToastMessage("寃ъ쟻 洹몃９??癒쇱? ?좏깮?댁＜?몄슂.", true); return; }
    const modal = document.getElementById('loadInclusionsModal');
    const listEl = document.getElementById('inclusionsList');
    const loadingMsg = document.getElementById('loadingInclusionsMsg');
    const searchInput = document.getElementById('inclusionsSearchInput');
    searchInput.value = '';
    modal.classList.remove('hidden');
    listEl.innerHTML = '';
    loadingMsg.style.display = 'block';
    const allSets = await loadAllInclusionDataSets();
    loadingMsg.style.display = 'none';
    const clickHandler = (item) => {
        applyInclusionData(item);
        modal.classList.add('hidden');
    };
    renderFilteredList({ fullList: allSets, searchTerm: '', listElementId: 'inclusionsList', clickHandler, itemTitleField: 'name' });
    searchInput.oninput = () => {
        renderFilteredList({ fullList: allSets, searchTerm: searchInput.value, listElementId: 'inclusionsList', clickHandler, itemTitleField: 'name' });
    };
}
function applyInclusionData(item) {
    if (!activeGroupId) return;
    const groupData = quoteGroupsData[activeGroupId];
    const groupEl = document.getElementById(`group-content-${activeGroupId}`);
    if (!groupData || !groupEl) return;
    groupData.inclusionText = item.inclusions || '';
    groupData.exclusionText = item.exclusions || '';
    groupData.inclusionExclusionDocId = item.id;
    groupData.inclusionExclusionDocName = item.name;
    groupEl.querySelector('.inclusion-text').value = groupData.inclusionText;
    groupEl.querySelector('.exclusion-text').value = groupData.exclusionText;
    groupEl.querySelector('.inclusion-exclusion-doc-name-display').textContent = `(${item.name})`;
    showToastMessage(`'${item.name}' ?댁뿭???곸슜?덉뒿?덈떎.`);
}
async function loadAllSnippets() {
    const dataSets = [];
    try {
        const q = db.collection("textSnippets").orderBy("timestamp", "desc");
        const querySnapshot = await q.get();
        querySnapshot.forEach((doc) => { dataSets.push({ id: doc.id, ...doc.data() }); });
        return dataSets;
    } catch (error) { console.error("?먯＜ ?곕뒗 臾몄옄 紐⑸줉 遺덈윭?ㅺ린 ?ㅻ쪟:", error); showToastMessage("?먯＜ ?곕뒗 臾몄옄 紐⑸줉??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", true); return []; }
}
function applyMemoData(snippet) {
    const memoTextarea = document.getElementById('memoText');
    if (!memoTextarea) return;
    memoTextarea.value = snippet.content || '';
    showToastMessage(`'${snippet.name}' ?댁슜??硫붾え???곸슜?덉뒿?덈떎.`);
}
async function openLoadMemoModal() {
    const modal = document.getElementById('loadMemoModal');
    const listEl = document.getElementById('memoList');
    const loadingMsg = document.getElementById('loadingMemoMsg');
    const searchInput = document.getElementById('memoSearchInput');
    searchInput.value = '';
    modal.classList.remove('hidden');
    listEl.innerHTML = '';
    loadingMsg.style.display = 'block';
    const allSnippets = await loadAllSnippets();
    loadingMsg.style.display = 'none';
    const clickHandler = (item) => {
        applyMemoData(item);
        modal.classList.add('hidden');
    };
    renderFilteredList({ fullList: allSnippets, searchTerm: '', listElementId: 'memoList', clickHandler, itemTitleField: 'name' });
    searchInput.oninput = () => {
        renderFilteredList({ fullList: allSnippets, searchTerm: searchInput.value, listElementId: 'memoList', clickHandler, itemTitleField: 'name' });
    };
}

function addNewGroup() {
    groupCounter++;
    const groupId = groupCounter;
    const groupName = `寃ъ쟻 ${groupId}`;
    getCurrentQuoteGroups()[groupId] = {
        id: groupId,
        name: groupName,
        calculators: [{ id: `calc_${Date.now()}`, pnr: '', tableHTML: null }],
        flightSchedule: [], 
        priceInfo: [],
        inclusionExclusionDocId: null,
        inclusionExclusionDocName: '?덈줈???ы븿/遺덊룷???댁뿭',
        hotelMakerData: {
            allHotelData: [{ nameKo: `???명뀛 1`, nameEn: "", website: "", image: "", description: "" }],
            currentHotelIndex: 0,
            currentHotelDocumentId: null,
            currentHotelDocumentName: "???명뀛 ?뺣낫 紐⑥쓬"
        },
        itineraryData: {
            title: "???ы뻾 ?쇱젙??,
            editingTitle: false,
            days: [
                { date: dateToYyyyMmDd(new Date()), activities: [], isCollapsed: false, editingDate: false }
            ]
        }
    };
    createGroupUI(groupId);
    switchTab(groupId);
    
    // ??寃ъ쟻 異붽? ??遺꾪븷 ?⑤꼸 ?덈퉬瑜?理쒖냼 ?덈퉬濡??ъ꽕??
    setTimeout(resetSplitPaneWidths, 50);
    
    showToastMessage(`??寃ъ쟻 洹몃９ ${groupName}??媛) 異붽??섏뿀?듬땲??`);
}
function deleteGroup(groupId) {
    if (Object.keys(quoteGroupsData).length <= 1) { showToastMessage('留덉?留?寃ъ쟻 洹몃９? ??젣?????놁뒿?덈떎.', true); return; }
    if (confirm(`寃ъ쟻 ${groupId}??瑜? ??젣?섏떆寃좎뒿?덇퉴?`)) {
        document.querySelector(`.quote-tab[data-group-id="${groupId}"]`)?.remove();
        document.getElementById(`group-content-${groupId}`)?.remove();
        delete quoteGroupsData[groupId];
        if (activeGroupId == groupId) {
            const lastTab = document.querySelector('.quote-tab:last-child');
            if (lastTab) { switchTab(lastTab.dataset.groupId); } else { activeGroupId = null; }
        }
        showToastMessage(`寃ъ쟻 洹몃９ ${groupId}??媛) ??젣?섏뿀?듬땲??`);
    }
}
function deleteActiveGroup() { if (activeGroupId) { deleteGroup(activeGroupId); } }
function copyActiveGroup() {
    if (!activeGroupId) return;
    syncGroupUIToData(activeGroupId);
    const newGroupData = JSON.parse(JSON.stringify(quoteGroupsData[activeGroupId]));
    groupCounter++;
    newGroupData.id = groupCounter;
    newGroupData.name = `${newGroupData.name} (蹂듭궗蹂?`;
    newGroupData.calculators.forEach(calc => { calc.id = `calc_${Date.now()}_${Math.random()}`; });
    quoteGroupsData[groupCounter] = newGroupData;
    createGroupUI(groupCounter);
    switchTab(groupCounter);
    showToastMessage(`寃ъ쟻 洹몃９ ${activeGroupId}??媛) 蹂듭궗?섏뼱 ??洹몃９ ${groupCounter}??媛) ?앹꽦?섏뿀?듬땲??`);
}
function switchTab(newGroupId) {
    if (activeGroupId && activeGroupId !== newGroupId) {
        syncGroupUIToData(activeGroupId);
    }
    activeGroupId = String(newGroupId);
    document.querySelectorAll('.quote-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.groupId == newGroupId);
    });
    const contentsContainer = document.getElementById('quoteGroupContentsContainer');
    contentsContainer.innerHTML = '';
    const groupEl = document.createElement('div');
    groupEl.className = 'calculation-group-content active';
    groupEl.id = `group-content-${newGroupId}`;
    contentsContainer.appendChild(groupEl);
    initializeGroup(groupEl, newGroupId);
    
    // ???꾪솚 ??遺꾪븷 ?⑤꼸 ?덈퉬瑜?理쒖냼 ?덈퉬濡??ъ꽕??
    setTimeout(resetSplitPaneWidths, 50);
}

function createGroupUI(groupId) {
    const tabsContainer = document.getElementById('quoteGroupTabs');
    
    // 湲곗〈 ??씠 ?덈뒗吏 ?뺤씤
    const existingTab = tabsContainer.querySelector(`[data-group-id="${groupId}"]`);
    if (existingTab) {
        return; // ?대? 議댁옱?섎㈃ ?앹꽦?섏? ?딆쓬
    }
    
    const tabEl = document.createElement('div');
    tabEl.className = 'quote-tab';
    tabEl.dataset.groupId = groupId;
    const groupName = quoteGroupsData[groupId]?.name || `寃ъ쟻 ${groupId}`;
    tabEl.innerHTML = `<span title="?붾툝?대┃?섏뿬 ?섏젙 媛??>${groupName}</span><button type="button" class="close-tab-btn" title="???リ린">횞</button>`;
    tabsContainer.appendChild(tabEl);
    tabEl.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') switchTab(groupId); });
    tabEl.querySelector('.close-tab-btn').addEventListener('click', () => deleteGroup(groupId));
}

function renderCalculators(groupId) {
    const groupData = quoteGroupsData[groupId];
    const groupEl = document.getElementById(`group-content-${groupId}`);
    if (!groupData || !groupEl) return;
    
    const calculatorsWrapper = groupEl.querySelector(`#calculators-wrapper-${groupId}`);
    calculatorsWrapper.innerHTML = ''; 

    if (groupData.calculators && groupData.calculators.length > 0) {
        groupData.calculators.forEach(calcData => {
            createCalculatorInstance(calculatorsWrapper, groupId, calcData);
        });
    }
}

function initializeGroup(groupEl, groupId) {
    groupEl.innerHTML = `<div class="flex flex-col xl:flex-row gap-6"> 
        <div class="xl:w-1/2 flex flex-col"> 
            <div id="calculators-wrapper-${groupId}" class="space-y-4"></div> 
            <div class="mt-4 flex gap-2">
                <button type="button" class="btn btn-outline add-calculator-btn w-1/2"><i class="fas fa-plus mr-2"></i>寃ъ쟻 怨꾩궛 異붽?</button>
                <button type="button" class="btn btn-outline copy-last-calculator-btn w-1/2"><i class="fas fa-copy mr-2"></i>寃ъ쟻 蹂듭궗</button>
            </div> 
        </div> 
        <div class="xl:w-1/2 space-y-6 right-panel-container"> 
            <section class="p-4 sm:p-6 border rounded-lg bg-gray-50/50">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-semibold">?붽툑 ?덈궡</h2>
                    <div class="flex items-center space-x-2">
                        <button type="button" class="btn btn-sm btn-outline copy-price-info-btn" title="HTML 蹂듭궗"><i class="fas fa-clipboard"></i> 肄붾뱶 蹂듭궗</button>
                        <button type="button" class="btn btn-sm btn-green add-price-subgroup-btn"><i class="fas fa-plus"></i> 異붽?</button>
                    </div>
                </div>
                <div class="space-y-4 price-info-container"></div>
            </section> 
            <section class="p-4 sm:p-6 border rounded-lg bg-gray-50/50">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-semibold">??났 ?ㅼ?以?/h2>
                    <div class="flex items-center space-x-2">
                        <button type="button" class="btn btn-sm btn-outline copy-flight-schedule-btn" title="HTML 蹂듭궗"><i class="fas fa-clipboard"></i> 肄붾뱶 蹂듭궗</button>
                        <button type="button" class="btn btn-sm btn-green parse-gds-btn">GDS ?뚯떛</button>
                        <button type="button" class="btn btn-sm btn-outline add-flight-subgroup-btn"><i class="fas fa-plus"></i> 異붽?</button>
                    </div>
                </div>
                <div class="space-y-4 flight-schedule-container"></div>
            </section> 
            <section class="p-4 sm:p-6 border rounded-lg bg-gray-50/50">
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center"><h2 class="text-base font-semibold">?ы븿/遺덊룷??/h2><span class="text-sm text-gray-500 ml-2 inclusion-exclusion-doc-name-display"></span></div>
                    <button type="button" class="btn btn-sm btn-green load-inclusion-exclusion-db-btn"><i class="fas fa-database mr-1"></i> DB 遺덈윭?ㅺ린</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="w-full sm:w-1/2"><div class="flex items-center mb-1"><h3 class="font-medium">?ы븿</h3><button type="button" class="ml-2 copy-inclusion-btn inline-copy-btn" title="?ы븿 ?댁뿭 蹂듭궗"><i class="far fa-copy"></i></button></div><textarea class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm inclusion-text" rows="5" title="?대┃?섏뿬 ?섏젙 媛??></textarea></div>
                    <div class="w-full sm:w-1/2"><div class="flex items-center mb-1"><h3 class="font-medium">遺덊룷??/h3><button type="button" class="ml-2 copy-exclusion-btn inline-copy-btn" title="遺덊룷???댁뿭 蹂듭궗"><i class="far fa-copy"></i></button></div><textarea class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm exclusion-text" rows="5" title="?대┃?섏뿬 ?섏젙 媛??></textarea></div>
                </div>
            </section> 
            <section class="p-4 sm:p-6 border rounded-lg bg-gray-50/50"><h2 class="text-base font-semibold mb-4">?명뀛移대뱶 硫붿씠而?/h2><div id="hotel-maker-container-${groupId}"></div></section> 
            <section class="p-4 sm:p-6 border rounded-lg bg-gray-50/50"><div id="itinerary-planner-container-${groupId}"></div></section> 
        </div> 
    </div>`;

    const groupData = quoteGroupsData[groupId];
    if (!groupData) return;

    renderCalculators(groupId);

    const calculatorsWrapper = groupEl.querySelector(`#calculators-wrapper-${groupId}`);
    if (calculatorsWrapper) {
        new Sortable(calculatorsWrapper, {
            handle: '.calculator-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const { oldIndex, newIndex } = evt;
                if (oldIndex === newIndex) return;
                syncGroupUIToData(groupId);
                const calculators = groupData.calculators;
                const [movedItem] = calculators.splice(oldIndex, 1);
                calculators.splice(newIndex, 0, movedItem);
                renderCalculators(groupId);
            }
        });
    }

    const flightContainer = groupEl.querySelector('.flight-schedule-container');
    if (groupData.flightSchedule) { groupData.flightSchedule.forEach(subgroup => createFlightSubgroup(flightContainer, subgroup, groupId)); }
    const priceContainer = groupEl.querySelector('.price-info-container');
    if (groupData.priceInfo) { groupData.priceInfo.forEach(subgroup => createPriceSubgroup(priceContainer, subgroup, groupId)); }
    const inclusionTextEl = groupEl.querySelector('.inclusion-text');
    const exclusionTextEl = groupEl.querySelector('.exclusion-text');
    if (inclusionTextEl) inclusionTextEl.value = groupData.inclusionText || '';
    if (exclusionTextEl) exclusionTextEl.value = groupData.exclusionText || '';
    groupEl.querySelector('.inclusion-exclusion-doc-name-display').textContent = `(${groupData.inclusionExclusionDocName || '???댁뿭'})`;

    const hotelMakerContainer = groupEl.querySelector(`#hotel-maker-container-${groupId}`);
    if (hotelMakerContainer) {
        initializeHotelMakerForGroup(hotelMakerContainer, groupId);
    }
    const itineraryContainer = groupEl.querySelector(`#itinerary-planner-container-${groupId}`);
    if (itineraryContainer) {
        initializeItineraryPlannerForGroup(itineraryContainer, groupId);
    }
}

function buildCalculatorDOM(calcContainer) {
    const content = document.createElement('div');
    content.innerHTML = `<div class="split-container"><div class="pnr-pane"><label class="label-text font-semibold mb-2"><span class="pnr-title-span" title="?붾툝?대┃?섏뿬 ?섏젙 媛??>PNR ?뺣낫</span></label><textarea class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm" placeholder="PNR ?뺣낫瑜??ш린??遺숈뿬?ｌ쑝?몄슂."></textarea></div><div class="resizer-handle"></div><div class="quote-pane"><div class="table-container"><table class="quote-table"><thead><tr class="header-row"><th><button type="button" class="btn btn-sm btn-primary add-person-type-btn"><i class="fas fa-plus"></i></button></th></tr><tr class="count-row"><th></th></tr></thead><tbody></tbody><tfoot></tfoot></table></div></div></div>`;
    const calculatorElement = content.firstElementChild;
    calcContainer.appendChild(calculatorElement);

    // 珥덇린 ?덈퉬 ?ㅼ젙 - PNR ?곸뿭?????볤쾶
    const pnrPane = calculatorElement.querySelector('.pnr-pane');
    const quotePane = calculatorElement.querySelector('.quote-pane');
    
    // 而⑦뀒?대꼫媛 DOM??異붽?????珥덇린 ?ш린 ?ㅼ젙
    setTimeout(() => {
        const container = calculatorElement.querySelector('.split-container');
        if (container) {
            const containerWidth = container.offsetWidth;
            const resizerWidth = 5; // resizer-handle width
            const idealQuoteWidth = 300; // 寃ъ쟻 ?뚯씠釉??댁긽?곸씤 ?ш린
            const idealPnrWidth = containerWidth - idealQuoteWidth - resizerWidth;
            
            if (idealPnrWidth > 150) { // 理쒖냼 PNR ?덈퉬 ?뺤씤
                pnrPane.style.width = idealPnrWidth + 'px';
                quotePane.style.width = idealQuoteWidth + 'px';
            }
        }
    }, 0);

    const tbody = calculatorElement.querySelector('tbody');
    ROW_DEFINITIONS.forEach(def => {
        const row = tbody.insertRow();
        row.dataset.rowId = def.id;
        const labelCell = row.insertCell(0);
        if (def.type === 'button') {
            labelCell.innerHTML = `<button type="button" class="btn btn-sm btn-secondary add-dynamic-row-btn">${def.label}</button>`;
        } else { 
            labelCell.innerHTML = `<span class="cost-row-label-span" title="?붾툝?대┃?섏뿬 ?섏젙 媛??>${def.label}</span>`; 
        }
    });
}

function createCalculatorInstance(wrapper, groupId, calcData) {
    const instanceContainer = document.createElement('div');
    instanceContainer.className = 'calculator-instance border p-4 rounded-lg relative bg-white shadow mb-4';
    instanceContainer.dataset.calculatorId = calcData.id;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'calculator-header flex justify-between items-center pb-2 mb-2 border-b';
    headerDiv.innerHTML = `
        <div class="calculator-handle cursor-grab text-gray-500 p-1" title="?쒖꽌 蹂寃?>
            <i class="fas fa-grip-vertical"></i>
        </div>
        <button type="button" class="delete-calculator-btn text-gray-400 hover:text-red-600 z-10 p-1" title="??怨꾩궛湲???젣">
            <i class="fas fa-times-circle"></i>
        </button>
    `;
    
    instanceContainer.appendChild(headerDiv);
    wrapper.appendChild(instanceContainer);
    buildCalculatorDOM(instanceContainer);

    if (calcData && calcData.tableHTML) {
        restoreCalculatorState(instanceContainer, calcData);
    } else {
        addPersonTypeColumn(instanceContainer, '?깆씤', 1);
    }
    
    calculateAll(instanceContainer);
}

function restoreCalculatorState(instanceContainer, calcData) {
    if (!instanceContainer || !calcData) return;
    const pnrTextarea = instanceContainer.querySelector('.pnr-pane textarea');
    if (pnrTextarea) pnrTextarea.value = calcData.pnr || '';
    
    const pnrTitleSpan = instanceContainer.querySelector('.pnr-title-span');
    if (pnrTitleSpan) pnrTitleSpan.textContent = calcData.pnrTitle || 'PNR ?뺣낫';

    const table = instanceContainer.querySelector('.quote-table');
    if (table && calcData.tableHTML) { 
        table.innerHTML = calcData.tableHTML;
    }
    else { 
        addPersonTypeColumn(instanceContainer, '?깆씤', 1);
    }
}

// =======================================================================
// 7. 寃ъ쟻 怨꾩궛湲??듭떖 濡쒖쭅
// =======================================================================
function makeEditable(element, inputType, onBlurCallback) {
    if (element.dataset.editing) return;
    element.dataset.editing = 'true';
    
    const currentText = element.textContent;
    const input = document.createElement('input');
    input.type = inputType;
    input.value = inputType === 'number' ? parseInt(currentText.replace(/,/g, ''), 10) || 0 : currentText;
    input.className = 'person-type-input w-full bg-yellow-100 text-center';
    element.style.display = 'none';
    element.parentNode.insertBefore(input, element.nextSibling);
    input.focus();
    input.select();

    const finishEditing = () => {
        element.textContent = input.value;
        element.style.display = '';
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
        if (onBlurCallback) onBlurCallback();
        delete element.dataset.editing;
    };

    input.addEventListener('blur', finishEditing, { once: true });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            e.target.blur();
        }
    });
}

function getCellContent(rowId, colIndex, type) {
    const name = `group[${colIndex}][${rowId}]`;
    let initialValue = '';
    if (type === 'costInput') {
        if (rowId === 'insurance') {
            initialValue = '5,000';
        }
    }
    switch (type) {
        case 'costInput':
        case 'salesInput':
             return `<input type="text" class="input-field-sm ${type === 'salesInput' ? 'sales-price' : 'cost-item'}" name="${name}" value="${initialValue}" placeholder="">`;
        case 'calculated': 
            return `<div class="calculated-field" data-row-id="${rowId}">0 ??/div>`;
        case 'calculatedPercentage': 
            return `<div class="calculated-field" data-row-id="${rowId}">0.00 %</div>`;
        default: return '';
    }
}

function addPersonTypeColumn(calcContainer, typeName = '?깆씤', count = 1) {
    const table = calcContainer.querySelector('.quote-table');
    if (!table) return;
    const headerRow = table.querySelector('thead .header-row');
    const colIndex = headerRow.cells.length;
    const headerCell = document.createElement('th');
    headerCell.innerHTML = `<div class="relative"><span class="person-type-name-span" title="?붾툝?대┃?섏뿬 ?섏젙 媛??>${typeName}</span><button type="button" class="remove-col-btn" title="????ぉ ??젣"><i class="fas fa-times"></i></button></div>`;
    headerRow.appendChild(headerCell);
    const countCell = document.createElement('th');
    countCell.innerHTML = `<span class="person-count-span" title="?붾툝?대┃?섏뿬 ?섏젙 媛??>${count}</span>`;
    table.querySelector('thead .count-row').appendChild(countCell);
    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowId = tr.dataset.rowId;
        const rowDef = ROW_DEFINITIONS.find(r => r.id === rowId) || { type: 'costInput' };
        tr.insertCell(-1).innerHTML = getCellContent(rowId, colIndex, rowDef.type);
    });
    
    updateSummaryRow(calcContainer);
    calculateAll(calcContainer);
}

function addDynamicCostRow(calcContainer, label = '?좉퇋 ??ぉ') {
    const table = calcContainer.querySelector('.quote-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    const numCols = table.querySelector('thead .header-row').cells.length;
    const rowId = `dynamic_${Date.now()}`;
    const buttonRow = tbody.querySelector('tr[data-row-id="addDynamicRow"]');
    if (!buttonRow) return;
    const insertionIndex = Array.from(tbody.rows).indexOf(buttonRow);
    const newRow = tbody.insertRow(insertionIndex);
    newRow.dataset.rowId = rowId;
    newRow.insertCell(0).innerHTML = `<div class="flex items-center"><button type="button" class="dynamic-row-delete-btn"><i class="fas fa-trash-alt"></i></button><span class="dynamic-row-label-span ml-2" title="?붾툝?대┃?섏뿬 ?섏젙 媛??>${label}</span></div>`;
    for (let i = 1; i < numCols; i++) { newRow.insertCell(i).innerHTML = getCellContent(rowId, i, 'costInput'); }
    
    calculateAll(calcContainer);
}
function updateSummaryRow(calcContainer) {
    const table = calcContainer.querySelector('.quote-table');
    if (!table) return;
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) { tfoot = document.createElement('tfoot'); table.appendChild(tfoot); }
    tfoot.innerHTML = '';
    const headerRow = table.querySelector('.header-row');
    if (!headerRow || headerRow.cells.length <= 1) return;
    const summaryRow = tfoot.insertRow();
    summaryRow.insertCell(0).innerHTML = '<div class="p-2 font-bold text-center">?꾩껜 ?⑷퀎</div>';
    const summaryCell = summaryRow.insertCell(1);
    summaryCell.colSpan = headerRow.cells.length - 1;
    summaryCell.innerHTML = `<div class="totals-summary-section flex items-center justify-around p-1"><div class="text-center mx-2"><span class="text-base font-medium text-gray-600">?꾩껜?곹뭹媛 </span><span class="text-lg font-bold text-indigo-700 totalSalesPrice">0 ??/span></div><div class="text-center mx-2"><span class="text-base font-medium text-gray-600">?꾩껜?섏씡 </span><span class="text-lg font-bold text-indigo-700 totalProfit">0 ??/span></div><div class="text-center mx-2"><span class="text-base font-medium text-gray-600">?꾩껜?섏씡瑜?</span><span class="text-lg font-bold text-indigo-700 totalProfitMargin">0.00 %</span></div></div>`;
    summaryRow.cells[0].style.borderTop = "2px solid #a0aec0";
    summaryCell.style.borderTop = "2px solid #a0aec0";
}

function updateCalculatedCell(table, colIndex, rowId, value) {
    const row = table.querySelector(`tbody tr[data-row-id="${rowId}"]`);
    if (row && row.cells[colIndex]) {
        const div = row.cells[colIndex].querySelector('div');
        if (div) div.textContent = value;
    }
}

function calculateAll(calcContainer) {
    if (!calcContainer) return;
    const table = calcContainer.querySelector('.quote-table');
    if (!table) return;
    const headerRow = table.querySelector('.header-row');
    if (!headerRow) return;
    let grandTotalSales = 0, grandTotalProfit = 0;
    
    for (let i = 1; i < headerRow.cells.length; i++) {
        const countCell = table.querySelector(`.count-row th:nth-child(${i + 1})`);
        const count = countCell ? parseInt(countCell.textContent.replace(/,/g, ''), 10) || 0 : 0;
        let netCost = 0;

        table.querySelectorAll(`tbody tr td:nth-child(${i + 1}) .cost-item`).forEach(input => {
            const expression = input.dataset.formula || input.value;
            netCost += evaluateMath(expression);
        });

        const salesPriceInput = table.querySelector(`tbody tr td:nth-child(${i + 1}) .sales-price`);
        const salesPriceExpression = salesPriceInput ? (salesPriceInput.dataset.formula || salesPriceInput.value) : '0';
        const salesPrice = evaluateMath(salesPriceExpression);

        const profitPerPerson = salesPrice - netCost;
        const profitMargin = salesPrice > 0 ? (profitPerPerson / salesPrice) : 0;
        
        updateCalculatedCell(table, i, 'netCost', formatCurrency(netCost));
        updateCalculatedCell(table, i, 'profitPerPerson', formatCurrency(profitPerPerson));
        updateCalculatedCell(table, i, 'profitMargin', formatPercentage(profitMargin));
        
        grandTotalSales += salesPrice * count;
        grandTotalProfit += profitPerPerson * count;
    }
    
    const grandTotalProfitMargin = grandTotalSales > 0 ? (grandTotalProfit / grandTotalSales) : 0;
    const summarySection = calcContainer.querySelector('.totals-summary-section');
    if (!summarySection) return;
    summarySection.querySelector('.totalSalesPrice').textContent = formatCurrency(grandTotalSales);
    summarySection.querySelector('.totalProfit').textContent = formatCurrency(grandTotalProfit);
    summarySection.querySelector('.totalProfitMargin').textContent = formatPercentage(grandTotalProfitMargin);
}
// =======================================================================
// 8. 湲고? ?좏떥由ы떚 ?⑥닔
// =======================================================================
function createFlightSubgroup(container, subgroupData, groupId) {
    const subGroupDiv = document.createElement('div');
    subGroupDiv.className = 'dynamic-section flight-schedule-subgroup';
    subGroupDiv.id = subgroupData.id;
    subGroupDiv.innerHTML = `<button type="button" class="delete-dynamic-section-btn" title="??젣"><i class="fas fa-trash-alt"></i></button><div class="mb-2"><input type="text" class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm" placeholder="??났?? title="?대┃?섏뿬 ?섏젙 媛?? value="${subgroupData.title || ''}"></div><div class="overflow-x-auto"><table class="flight-schedule-table"><thead><tr><th>?몃챸</th><th>異쒕컻??/th><th>異쒕컻吏</th><th>異쒕컻?쒓컙</th><th>?꾩갑??/th><th>?꾩갑吏</th><th>?꾩갑?쒓컙</th><th style="width: 50px;"></th></tr></thead><tbody></tbody></table></div><div class="add-row-btn-container pt-2"><button type="button" class="add-row-btn"><i class="fas fa-plus mr-1"></i></button></div>`;
    const tbody = subGroupDiv.querySelector('tbody');
    subgroupData.rows.forEach(rowData => addFlightRow(tbody, rowData, subgroupData));
    
    container.appendChild(subGroupDiv);
}
function addFlightRow(tbody, rowData, subgroupData) {
    const tr = document.createElement('tr');
    const fields = [{ key: 'flightNum', placeholder: 'ZE561' }, { key: 'depDate', placeholder: '07/09' }, { key: 'originCity', placeholder: 'ICN' }, { key: 'depTime', placeholder: '20:55' }, { key: 'arrDate', placeholder: '07/09' }, { key: 'destCity', placeholder: 'CXR' }, { key: 'arrTime', placeholder: '23:55' }];
    tr.innerHTML = fields.map(f => `<td><span class="flight-schedule-cell" data-field="${f.key}" data-placeholder="${f.placeholder}" contenteditable="true" title="?대┃?섏뿬 ?섏젙 媛??>${rowData[f.key] || ''}</span></td>`).join('') + `<td class="text-center"><button type="button" class="delete-row-btn" title="??젣"><i class="fas fa-trash"></i></button></td>`;
    tbody.appendChild(tr);
}
function generateInclusionExclusionInlineHtml(inclusionText, exclusionText) { 
    const i = inclusionText ? inclusionText.replace(/\n/g, '<br>') : ''; 
    const e = exclusionText ? exclusionText.replace(/\n/g, '<br>') : ''; 
    return `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px"><tbody><tr><td style="vertical-align:top;width:50%;padding-right:10px"><h3 style="font-size:16px;font-weight:600;margin-bottom:8px">?ы븿</h3><div style="padding:8px;border:1px solid #eee;min-height:100px">${i}</div></td><td style="vertical-align:top;width:50%;padding-left:10px"><h3 style="font-size:16px;font-weight:600;margin-bottom:8px">遺덊룷??/h3><div style="padding:8px;border:1px solid #eee;min-height:100px">${e}</div></td></tr></tbody></table>`; 
}
function generateFlightScheduleInlineHtml(flightData) { 
    let html = ''; 
    if(flightData) {
        flightData.forEach(subgroup => { 
            html += `<h4 style="font-size:14px;font-weight:600;margin-bottom:8px">${subgroup.title || '??났 ?ㅼ?以?}</h4><table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;margin-bottom:16px"><thead><tr style="background-color:#f9fafb"><th style="border:1px solid #ddd;padding:8px;text-align:left">?몃챸</th><th style="border:1px solid #ddd;padding:8px;text-align:left">異쒕컻??/th><th style="border:1px solid #ddd;padding:8px;text-align:left">異쒕컻吏</th><th style="border:1px solid #ddd;padding:8px;text-align:left">異쒕컻?쒓컙</th><th style="border:1px solid #ddd;padding:8px;text-align:left">?꾩갑??/th><th style="border:1px solid #ddd;padding:8px;text-align:left">?꾩갑吏</th><th style="border:1px solid #ddd;padding:8px;text-align:left">?꾩갑?쒓컙</th></tr></thead><tbody>`; 
            subgroup.rows.forEach(row => { html += `<tr><td style="border:1px solid #ddd;padding:8px">${row.flightNum || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.depDate || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.originCity || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.depTime || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.arrDate || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.destCity || ''}</td><td style="border:1px solid #ddd;padding:8px">${row.arrTime || ''}</td></tr>`; }); 
            html += `</tbody></table>`; 
        }); 
    }
    return html; 
}

function createPriceSubgroup(container, subgroupData, groupId) {
    const subGroupDiv = document.createElement('div');
    subGroupDiv.className = 'dynamic-section price-subgroup';
    subGroupDiv.id = subgroupData.id;
    subGroupDiv.innerHTML = `<button type="button" class="delete-dynamic-section-btn" title="??젣"><i class="fas fa-trash-alt"></i></button><input type="text" class="w-full flex-grow px-3 py-2 border rounded-md shadow-sm mb-2 price-subgroup-title" placeholder="寃ъ쟻?ㅻ챸" title="?대┃?섏뿬 ?섏젙 媛?? value="${subgroupData.title || ''}"><table class="price-table"><thead><tr><th style="width:25%">?댁뿭</th><th>1?몃떦湲덉븸</th><th>?몄썝</th><th>珥앷툑??/th><th style="width:30%">鍮꾧퀬</th><th style="width:50px"></th></tr></thead><tbody></tbody><tfoot><tr><td colspan="3" class="text-right font-bold pr-2">珥??⑷퀎</td><td class="grand-total">0</td><td colspan="2"><button type="button" class="add-row-btn"><i class="fas fa-plus mr-1"></i></button></td></tr></tfoot></table>`;
    const tbody = subGroupDiv.querySelector('tbody');
    if (subgroupData.rows && subgroupData.rows.length > 0) {
        subgroupData.rows.forEach(rowData => addPriceRow(tbody, rowData, subgroupData, subGroupDiv, groupId));
    }
    updateGrandTotal(subGroupDiv); // ?섏젙???⑥닔 ?몄텧
    container.appendChild(subGroupDiv);
}

function addPriceRow(tbody, rowData, subgroupData, subGroupDiv, groupId) {
    const tr = document.createElement('tr');
    const fields = [
        { key: 'item', align: 'center', placeholder: '??ぉ' }, 
        { key: 'price', align: 'center', placeholder: '媛寃? }, 
        { key: 'count', align: 'center', placeholder: '?섎웾' }, 
        { key: 'total', align: 'center', readonly: true, placeholder: '?⑷퀎' }, 
        { key: 'remarks', align: 'center', placeholder: '鍮꾧퀬' }
    ];
    
    tr.innerHTML = fields.map(f => {
        const value = rowData[f.key] !== undefined ? 
            (f.key === 'price' || f.key === 'total' ? 
                (parseFloat(String(rowData[f.key]).replace(/,/g, '')) || 0).toLocaleString() : 
                rowData[f.key]) : '';
        
        return `<td><span class="price-table-cell text-${f.align}" data-field="${f.key}" data-placeholder="${f.placeholder}" ${f.readonly ? 'readonly' : 'contenteditable="true"'} title="${f.readonly ? '?먮룞 怨꾩궛?? : '?대┃?섏뿬 ?섏젙 媛??}">${value}</span></td>`;
    }).join('') + `<td><button type="button" class="delete-row-btn"><i class="fas fa-trash"></i></button></td>`;
    
    tbody.appendChild(tr);

    tr.querySelectorAll('.price-table-cell:not([readonly])').forEach(cell => {
        const field = cell.dataset.field;
        
        cell.addEventListener('input', () => {
            rowData[field] = cell.textContent.trim();
            updateRow();
        });

        if (field === 'price' || field === 'count') {
            cell.addEventListener('blur', (e) => {
                const numValue = parseFloat(e.target.textContent.replace(/,/g, '')) || 0;
                e.target.textContent = numValue.toLocaleString();
            });
        }
    });

    function updateRow() {
        const price = parseFloat(String(rowData.price).replace(/,/g, '')) || 0;
        const count = parseInt(String(rowData.count).replace(/,/g, '')) || 0;
        const total = price * count;
        rowData.total = total;
        
        const totalCell = tr.querySelector('[data-field="total"]');
        if (totalCell) totalCell.textContent = total.toLocaleString();
        
        updateGrandTotal(subGroupDiv); // ?섏젙???⑥닔 ?몄텧
    }
    updateRow();
}


/**
 * [??理쒖쥌 ?섏젙???⑥닔] ?붽툑 ?덈궡 ?뚯씠釉붿쓽 珥앺빀怨꾨? 怨꾩궛?섍퀬 ?붾㈃???낅뜲?댄듃?⑸땲??
 * ?곗씠??媛앹껜 ????붾㈃(DOM)??媛??됱뿉??吏곸젒 媛믪쓣 ?쎌뼱? 怨꾩궛?섏뿬 ?곗씠???숆린??臾몄젣瑜??닿껐?⑸땲??
 * @param {HTMLElement} subGroupDiv - 珥앺빀怨꾨? 怨꾩궛???붽툑 ?덈궡 洹몃９??DOM ?붿냼
 */
function updateGrandTotal(subGroupDiv) {
    if (!subGroupDiv) return;
    
    let grandTotal = 0;
    const rows = subGroupDiv.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const priceCell = row.querySelector('[data-field="price"]');
        const countCell = row.querySelector('[data-field="count"]');

        if (priceCell && countCell) {
            const price = parseFloat(priceCell.textContent.replace(/,/g, '')) || 0;
            const count = parseInt(countCell.textContent.replace(/,/g, '')) || 0;
            grandTotal += price * count;
        }
    });
    
    const grandTotalCell = subGroupDiv.querySelector('.grand-total');
    if (grandTotalCell) {
        grandTotalCell.textContent = grandTotal.toLocaleString();
    }
}


function generatePriceInfoInlineHtml(priceData) {
    let html = '';
    if (priceData) {
        priceData.forEach(subgroup => {
            if (subgroup.title) { 
                html += `<h4 style="font-size:14px;font-weight:600;margin-bottom:8px; padding-left: 8px;">${subgroup.title}</h4>`; 
            }
            html += `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;margin-bottom:16px"><thead><tr style="background-color:#f9fafb"><th style="border:1px solid #ddd;padding:8px;text-align:center">?댁뿭</th><th style="border:1px solid #ddd;padding:8px;text-align:center">1?몃떦 湲덉븸</th><th style="border:1px solid #ddd;padding:8px;text-align:center">?몄썝</th><th style="border:1px solid #ddd;padding:8px;text-align:center">珥?湲덉븸</th><th style="border:1px solid #ddd;padding:8px;text-align:center">鍮꾧퀬</th></tr></thead><tbody>`;
            
            let grandTotal = 0;
            subgroup.rows.forEach(row => { 
                const p = parseFloat(String(row.price).replace(/,/g, '')) || 0; 
                const c = parseInt(String(row.count).replace(/,/g, '')) || 0; 
                const t = p * c; 
                grandTotal += t;
                
                html += `<tr><td style="border:1px solid #ddd;padding:8px">${row.item || ''}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${p.toLocaleString()}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${c}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${t.toLocaleString()}</td><td style="border:1px solid #ddd;padding:8px">${row.remarks || ''}</td></tr>`; 
            });
            
            html += `</tbody><tfoot><tr style="font-weight:bold"><td colspan="3" style="border:1px solid #ddd;padding:8px;text-align:right">珥??⑷퀎</td><td style="border:1px solid #ddd;padding:8px;text-align:right">${grandTotal.toLocaleString()}</td><td style="border:1px solid #ddd;padding:8px"></td></tr></tfoot></table>`;
        });
    }
    return html;
}


/**
 * 寃ъ쟻 怨꾩궛 紐⑤뱢??遺꾪븷 ?⑤꼸(split pane) ?덈퉬瑜?理쒖냼 ?곹깭濡??ъ꽕?뺥빀?덈떎.
 * quote-pane??CSS???뺤쓽??min-width濡??ㅼ젙?섍퀬 pnr-pane???섎㉧吏 怨듦컙??李⑥??섎룄濡??⑸땲??
 */
function resetSplitPaneWidths() {
    const splitContainers = document.querySelectorAll('.split-container');
    splitContainers.forEach(container => {
        const pnrPane = container.querySelector('.pnr-pane');
        const quotePane = container.querySelector('.quote-pane');
        const resizer = container.querySelector('.resizer-handle');

        if (pnrPane && quotePane && resizer) {
            // flexbox ?숈옉???좎떆 鍮꾪솢?깊솕?섏뿬 紐낆떆?곸씤 ?덈퉬 ?ㅼ젙???덉슜?⑸땲??
            pnrPane.style.flex = 'none';
            quotePane.style.flex = 'none';

            const containerWidth = container.offsetWidth;
            const resizerWidth = resizer.offsetWidth;
            
            // CSS?먯꽌 min-width 媛믪쓣 吏곸젒 媛?몄샃?덈떎.
            const quotePaneMinWidth = parseInt(window.getComputedStyle(quotePane).minWidth, 10);

            // quote-pane ?덈퉬瑜?min-width濡??ㅼ젙?⑸땲??
            const newQuoteWidth = quotePaneMinWidth;
            quotePane.style.width = `${newQuoteWidth}px`;
            
            // pnr-pane???섎㉧吏 ?덈퉬瑜?李⑥??섎룄濡??ㅼ젙?⑸땲??
            const newPnrWidth = containerWidth - newQuoteWidth - resizerWidth;
            pnrPane.style.width = `${newPnrWidth > 0 ? newPnrWidth : 0}px`;

            // ?좎떆 ??flexbox ?숈옉??蹂듭썝?⑸땲??
            setTimeout(() => {
                pnrPane.style.removeProperty('flex');
                quotePane.style.removeProperty('flex');
            }, 100);
        }
    });
}

function restoreState(data) {
    document.getElementById('customerInfoContainer').innerHTML = '';
    document.getElementById('quoteGroupTabs').innerHTML = '';
    document.getElementById('quoteGroupContentsContainer').innerHTML = '';
    
    quoteGroupsData = data.quoteGroupsData || {};

    Object.values(quoteGroupsData).forEach(group => {
        if (!group.name) {
            group.name = `寃ъ쟻 ${group.id}`;
        }
        if (!group.hotelMakerData) {
            group.hotelMakerData = {
                allHotelData: [{ nameKo: `???명뀛 1`, nameEn: "", website: "", image: "", description: "" }],
                currentHotelIndex: 0,
                currentHotelDocumentId: null,
                currentHotelDocumentName: "???명뀛 ?뺣낫 紐⑥쓬"
            };
        }
        if (!group.itineraryData) {
             group.itineraryData = {
                title: "???ы뻾 ?쇱젙??,
                editingTitle: false,
                days: [{ date: dateToYyyyMmDd(new Date()), activities: [], isCollapsed: false, editingDate: false }]
            };
        }
    });

    groupCounter = data.groupCounter || 0;
    document.getElementById('memoText').value = data.memoText || '';
    
    if (data.customerInfo && data.customerInfo.length > 0) { data.customerInfo.forEach(customer => createCustomerCard(customer)); }
    else { createCustomerCard(); }
    
    if (Object.keys(quoteGroupsData).length > 0) { 
        Object.keys(quoteGroupsData).forEach(id => createGroupUI(id)); 
        const groupIdToSelect = (data.activeGroupId && quoteGroupsData[data.activeGroupId]) ? data.activeGroupId : Object.keys(quoteGroupsData)[0];
        switchTab(groupIdToSelect);
    }
    else { 
        addNewGroup(); 
    }

    // ?뚯씪 濡쒕뱶 ??遺꾪븷 ?⑤꼸 ?덈퉬瑜?理쒖냼 ?덈퉬濡??ъ꽕?뺥빀?덈떎.
    // DOM???꾩쟾???뚮뜑留곷맂 ???ㅽ뻾?섎룄濡?setTimeout???ъ슜?⑸땲??
    setTimeout(resetSplitPaneWidths, 100);
}

function initializeNewSession() {
    // ?뚯씪 ???쒖뒪??珥덇린??
    if (filesManager.size === 0) {
        createNewFileTab('??寃ъ쟻??);
    }
    
    // 湲곗〈 珥덇린??濡쒖쭅
    document.getElementById('memoText').value = '吏?먯뼱?ㅼ슱???낆?留??붿껌';
    
    // ?꾩옱 ?몄뀡 ?낅뜲?댄듃
    updateCurrentSession();

    // ??泥?濡쒕뱶 ??遺꾪븷 ?⑤꼸 ?덈퉬瑜?理쒖냼 ?덈퉬濡??ъ꽕?뺥빀?덈떎.
    setTimeout(resetSplitPaneWidths, 100);
}

// =======================================================================
// 9. ?대깽??由ъ뒪??以묒븰 愿由?(Event Delegation)
// =======================================================================
function setupEventListeners() {
    // --- ?뚯씪 ??諛??대깽??由ъ뒪??---
    const fileTabBar = document.getElementById('fileTabBar');
    if (fileTabBar) {
        fileTabBar.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            const fileTab = event.target.closest('.file-tab');
            
            if (button && button.id === 'newFileTabBtn') {
                createNewFileTab();
                return;
            }
            
            if (button && button.classList.contains('close-file-btn')) {
                event.stopPropagation();
                const fileId = button.closest('.file-tab').dataset.fileId;
                closeFileTab(fileId);
                return;
            }
            
            if (fileTab && !button) {
                const fileId = fileTab.dataset.fileId;
                switchFileTab(fileId);
            }
        });
    }

    // --- ?곷떒 ?ㅻ뜑 諛?湲濡쒕쾶 踰꾪듉 ?대깽?몃뒗 rebindWorkspaceEventListeners?먯꽌 泥섎━ ---

    // --- ?뚯씪 遺덈윭?ㅺ린 ?쇰꺼 ?대┃ ?대깽??由ъ뒪?덈뒗 rebindWorkspaceEventListeners?먯꽌 泥섎━ ---
    // loadFile ?대깽?몃뒗 ?뚯씪 ???꾪솚 ?쒕쭏??rebindWorkspaceEventListeners()?먯꽌 ?щ컮?몃뵫??

    // --- 怨좉컼 ?뺣낫 而⑦뀒?대꼫 ?대깽???꾩엫? rebindWorkspaceEventListeners?먯꽌 泥섎━ ---

    // --- 紐⑤떖 ?リ린 踰꾪듉 ---
    document.body.addEventListener('click', event => {
        if (event.target.closest('#closeLoadInclusionsModalBtn, #cancelLoadInclusionsModalBtn')) {
            document.getElementById('loadInclusionsModal').classList.add('hidden');
        }
        if (event.target.closest('#closeLoadMemoModalBtn, #cancelLoadMemoModalBtn')) {
            document.getElementById('loadMemoModal').classList.add('hidden');
        }
        if (event.target.closest('#closeRecentFilesModalButton, #cancelRecentFilesModalButton')) {
            document.getElementById('recentFilesModal').classList.add('hidden');
        }
        if (event.target.closest('#ipCancelActivityButton')) {
            document.getElementById('ipActivityModal').classList.add('hidden');
        }
        if (event.target.closest('#ipCancelDeleteDayButton')) {
             document.getElementById('ipConfirmDeleteDayModal').classList.add('hidden');
        }
        if(event.target.closest('#ipCloseLoadTemplateModal, #ipCancelLoadTemplateModal')) {
            document.getElementById('ipLoadTemplateModal').classList.add('hidden');
        }
        if (event.target.closest('#ipCloseLoadAttractionModal, #ipCancelLoadAttractionModal')) {
            ip_closeLoadAttractionModal();
            ip_resetPendingAddActivityState();
        }
        if (event.target.closest('#ipChoiceCancelBtn')) {
            ip_closeAddActivityChoiceModal();
            ip_resetPendingAddActivityState();
        }
        if (event.target.closest('#ipChoiceFromDbBtn')) {
            ip_closeAddActivityChoiceModal();
            ip_loadAttractionListFromFirestore();
        }
        if (event.target.closest('#ipChoiceNewInputBtn')) {
            const groupId = ipPendingNewActivityGroupId;
            const dayIndex = ipPendingNewActivityDayIndex;
            ip_closeAddActivityChoiceModal();
            if (groupId && Number.isInteger(dayIndex)) {
                ip_openBlankActivityModal(groupId, dayIndex);
                ip_resetPendingAddActivityState();
            } else {
                showToastMessage('???쇱젙 異붽? ????좎쭨瑜?李얠쓣 ???놁뒿?덈떎.', true);
                ip_resetPendingAddActivityState();
            }
        }
    });

    // --- ?숈쟻 而⑦뀗痢?而⑦뀒?대꼫 (?대깽???꾩엫) ---
    const contentsContainer = document.getElementById('quoteGroupContentsContainer');
    if (!contentsContainer) return;

    contentsContainer.addEventListener('click', (event) => {
        const target = event.target;
        const button = target.closest('button');

        if (!button) {
            if(target.matches('.person-type-name-span, .person-count-span, .dynamic-row-label-span, .cost-row-label-span')) {
                const calcContainer = target.closest('.calculator-instance');
                const callback = () => calculateAll(calcContainer);
                const inputType = target.classList.contains('person-count-span') ? 'number' : 'text';
                makeEditable(target, inputType, callback);
            }
            return;
        }
        
        const groupId = button.closest('.calculation-group-content')?.id.split('-').pop();

        if (button.classList.contains('add-calculator-btn')) {
            syncGroupUIToData(groupId);
            const groupData = quoteGroupsData[groupId];
            const newCalcData = { id: `calc_${Date.now()}`, pnr: '', tableHTML: null, pnrTitle: 'PNR ?뺣낫' };
            groupData.calculators.push(newCalcData);
            renderCalculators(groupId);
        } else if (button.classList.contains('copy-last-calculator-btn')) {
             const groupData = quoteGroupsData[groupId];
            if (!groupData || groupData.calculators.length === 0) { showToastMessage('蹂듭궗??寃ъ쟻 怨꾩궛???놁뒿?덈떎.', true); return; }
            syncGroupUIToData(groupId);
            const lastCalculatorData = groupData.calculators[groupData.calculators.length - 1];
            const newCalcData = JSON.parse(JSON.stringify(lastCalculatorData));
            newCalcData.id = `calc_${Date.now()}_${Math.random()}`;
            groupData.calculators.push(newCalcData);
            renderCalculators(groupId);
        } else if (button.classList.contains('delete-calculator-btn')) {
            if (confirm('??寃ъ쟻 怨꾩궛湲곕? ??젣?섏떆寃좎뒿?덇퉴?')) {
                const instance = button.closest('.calculator-instance');
                const calcId = instance.dataset.calculatorId;
                quoteGroupsData[groupId].calculators = quoteGroupsData[groupId].calculators.filter(c => c.id !== calcId);
                instance.remove();
            }
        } else if (button.classList.contains('add-person-type-btn')) {
            const calcContainer = button.closest('.calculator-instance');
            addPersonTypeColumn(calcContainer, '?꾨룞', 1);
        } else if (button.classList.contains('add-dynamic-row-btn')) {
            const calcContainer = button.closest('.calculator-instance');
            addDynamicCostRow(calcContainer);
        } else if (button.classList.contains('remove-col-btn')) {
            if (confirm('?대떦 ??ぉ????젣?섏떆寃좎뒿?덇퉴?')) {
                const headerCell = button.closest('th');
                const colIndex = Array.from(headerCell.parentNode.children).indexOf(headerCell);
                const calcContainer = button.closest('.calculator-instance');
                calcContainer.querySelectorAll('.quote-table tr').forEach(row => row.cells[colIndex]?.remove());
                updateSummaryRow(calcContainer);
                calculateAll(calcContainer);
            }
        } else if (button.classList.contains('dynamic-row-delete-btn')) {
            if (confirm('?대떦 ??ぉ????젣?섏떆寃좎뒿?덇퉴?')) {
                 const calcContainer = button.closest('.calculator-instance');
                 button.closest('tr').remove();
                 calculateAll(calcContainer);
            }
        } else if (button.id.startsWith('hm-copyHtmlBtn-')) {
            hm_copyOptimizedHtml(groupId);
        } else if (button.id.startsWith('hm-previewHotelBtn-')) {
            hm_previewHotelInfo(groupId);
        } else if (button.id.startsWith('hm-loadHotelHtmlBtn-')) {
            hm_openLoadHotelSetModal(groupId);
        } else if (button.id.startsWith('hm-addHotelTabBtn-')) {
            hm_addHotel(groupId);
        } else if (button.matches('.hotel-tab-button')) {
            if(target.closest('.tab-delete-icon')) {
                 hm_deleteHotel(groupId, parseInt(button.dataset.index));
            } else {
                 hm_switchTab(groupId, parseInt(button.dataset.index));
            }
        } else if (button.classList.contains('parse-gds-btn')) {
            window.open('./gds_parser/gds_parser.html', 'GDS_Parser', `width=800,height=500,top=${(screen.height / 2) - 250},left=${(screen.width / 2) - 400}`);
        } else if (button.classList.contains('copy-flight-schedule-btn')) {
            copyHtmlToClipboard(generateFlightScheduleInlineHtml(quoteGroupsData[groupId].flightSchedule));
        } else if (button.classList.contains('copy-price-info-btn')) {
            syncGroupUIToData(groupId);
            copyHtmlToClipboard(generatePriceInfoInlineHtml(quoteGroupsData[groupId].priceInfo));
        } else if (button.classList.contains('add-flight-subgroup-btn')) {
            const flightContainer = button.closest('section').querySelector('.flight-schedule-container');
            const sg = { id: `flight_sub_${Date.now()}`, title: "", rows: [{}] };
            if (!quoteGroupsData[groupId].flightSchedule) quoteGroupsData[groupId].flightSchedule = [];
            quoteGroupsData[groupId].flightSchedule.push(sg);
            createFlightSubgroup(flightContainer, sg, groupId);
        } else if (button.classList.contains('add-price-subgroup-btn')) {
            const priceContainer = button.closest('section').querySelector('.price-info-container');
            const defaultRows = [
                { item: "?깆씤?붽툑", price: "0", count: "1", remarks: "" },
                { item: "?뚯븘?붽툑", price: "0", count: "0", remarks: "留?~12?몃?留? },
                { item: "?좎븘?붽툑", price: "0", count: "0", remarks: "留?4媛쒖썡誘몃쭔" }
            ];
            const sg = { id: `price_sub_${Date.now()}`, title: "", rows: defaultRows };
            if (!quoteGroupsData[groupId].priceInfo) quoteGroupsData[groupId].priceInfo = [];
            quoteGroupsData[groupId].priceInfo.push(sg);
            createPriceSubgroup(priceContainer, sg, groupId);
        } else if (button.classList.contains('load-inclusion-exclusion-db-btn')) {
            openLoadInclusionsModal();
        } else if (button.classList.contains('copy-inclusion-btn')) {
            copyToClipboard(button.closest('div').nextElementSibling.value, '?ы븿 ?댁뿭');
        } else if (button.classList.contains('copy-exclusion-btn')) {
            copyToClipboard(button.closest('div').nextElementSibling.value, '遺덊룷???댁뿭');
        } else if (button.classList.contains('delete-dynamic-section-btn')) {
            const section = button.closest('.dynamic-section');
            if (section.classList.contains('flight-schedule-subgroup')) {
                quoteGroupsData[groupId].flightSchedule = quoteGroupsData[groupId].flightSchedule.filter(g => g.id !== section.id);
            } else if (section.classList.contains('price-subgroup')) {
                quoteGroupsData[groupId].priceInfo = quoteGroupsData[groupId].priceInfo.filter(g => g.id !== section.id);
            }
            section.remove();
        } else if (button.classList.contains('add-row-btn')) {
            const section = button.closest('.dynamic-section');
            const tbody = section.querySelector('tbody');
            if (section.classList.contains('flight-schedule-subgroup')) {
                 const subgroupData = quoteGroupsData[groupId].flightSchedule.find(g => g.id === section.id);
                 const newRowData = {};
                 subgroupData.rows.push(newRowData);
                 addFlightRow(tbody, newRowData, subgroupData);
            } else if (section.classList.contains('price-subgroup')) {
                const subgroupData = quoteGroupsData[groupId].priceInfo.find(g => g.id === section.id);
                const newRowData = { item: "", price: "0", count: "1", remarks: "" };
                subgroupData.rows.push(newRowData);
                addPriceRow(tbody, newRowData, subgroupData, section, groupId);
            }
        } else if (button.classList.contains('delete-row-btn')) {
            const section = button.closest('.dynamic-section');
            const tr = button.closest('tr');
            const tbody = tr.parentNode;
            const rowIndex = Array.from(tbody.children).indexOf(tr);
            if (section.classList.contains('flight-schedule-subgroup')) {
                const subgroupData = quoteGroupsData[groupId].flightSchedule.find(g => g.id === section.id);
                subgroupData.rows.splice(rowIndex, 1);
            } else if (section.classList.contains('price-subgroup')) {
                const subgroupData = quoteGroupsData[groupId].priceInfo.find(g => g.id === section.id);
                if (subgroupData.rows.length > 1) {
                    subgroupData.rows.splice(rowIndex, 1);
                } else {
                     showToastMessage('理쒖냼 ??媛쒖쓽 ?붽툑 ??ぉ? ?좎??댁빞 ?⑸땲??', true);
                     return;
                }
            }
            tr.remove();
            if (section.classList.contains('price-subgroup')) {
                updateGrandTotal(section, groupId);
            }
        } else if (button.classList.contains('day-toggle-button')) {
             ip_handleToggleDayCollapse(event, button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
        }
        else if (
            button.id.startsWith('ip-') ||
            button.classList.contains('add-activity-button') ||
            button.classList.contains('edit-activity-button') ||
            button.classList.contains('duplicate-activity-button') ||
            button.classList.contains('delete-activity-button')
        ) {
            if (button.id.includes('loadFromDBBtn')) ip_openLoadTripModal(groupId);
            else if (button.id.includes('copyInlineHtmlButton')) ip_handleCopyInlineHtml(groupId);
            else if (button.id.includes('inlinePreviewButton')) ip_handleInlinePreview(groupId);
            else if (button.id.includes('addDayButton')) ip_addDay(groupId);
            else if (button.classList.contains('edit-date-button')) ip_handleEditDate(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
            else if (button.classList.contains('save-date-button')) ip_handleSaveDate(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId, button.previousElementSibling.value);
            else if (button.classList.contains('cancel-date-edit-button')) ip_handleCancelDateEdit(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
            else if (button.classList.contains('delete-day-button')) ip_showConfirmDeleteDayModal(button.closest('.ip-day-section').dataset.dayId.split('-')[1], groupId);
            else if (button.classList.contains('add-activity-button')) ip_openAddActivityChoiceModal(groupId, button.closest('.day-content-wrapper').querySelector('.activities-list').dataset.dayIndex);
            else if (button.classList.contains('edit-activity-button')) {
                const card = button.closest('.ip-activity-card');
                ip_openActivityModal(groupId, card.dataset.dayIndex, card.dataset.activityIndex);
            } else if (button.classList.contains('duplicate-activity-button')) {
                const card = button.closest('.ip-activity-card');
                ip_handleDuplicateActivity(groupId, card.dataset.dayIndex, card.dataset.activityIndex);
            } else if (button.classList.contains('delete-activity-button')) {
                const card = button.closest('.ip-activity-card');
                ip_handleDeleteActivity(groupId, card.dataset.dayIndex, card.dataset.activityIndex);
            }
        }
    });

    contentsContainer.addEventListener('focusin', (event) => {
        const target = event.target;
        if (target.matches('.cost-item, .sales-price')) {
            const formula = target.dataset.formula;
            if (formula) {
                target.value = formula;
            }
            target.select();
        } else if (target.matches('.flight-schedule-cell, .price-table-cell')) {
            // For contenteditable elements, select all text inside
            const range = document.createRange();
            range.selectNodeContents(target);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });

    contentsContainer.addEventListener('focusout', (event) => {
        const target = event.target;
        if (target.matches('.cost-item, .sales-price')) {
            const rawValue = target.value.trim();
            if (rawValue.startsWith('=')) {
                target.dataset.formula = rawValue;
                const result = evaluateMath(rawValue.substring(1));
                target.value = isNaN(result) ? 'Error' : Math.round(result).toLocaleString('ko-KR');
            } else {
                delete target.dataset.formula;
                const numericValue = parseFloat(rawValue.replace(/,/g, '')) || 0;
                target.value = numericValue.toLocaleString('ko-KR');
            }
            const calcContainer = target.closest('.calculator-instance');
            if (calcContainer) calculateAll(calcContainer);
        } else if(target.matches('.flight-schedule-cell, .price-table-cell, .inclusion-text, .exclusion-text, .price-subgroup-title')) {
            const groupId = target.closest('.calculation-group-content').id.split('-').pop();
            syncGroupUIToData(groupId);
        }
    });

    contentsContainer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('.cost-item, .sales-price')) {
            event.preventDefault();
            event.stopPropagation();
            const currentCell = event.target.closest('td');
            if (!currentCell) return;
            const currentRow = currentCell.closest('tr');
            const tableBody = currentRow.closest('tbody');
            const allRows = Array.from(tableBody.querySelectorAll('tr'));
            const currentRowIndex = allRows.indexOf(currentRow);
            const currentCellIndex = Array.from(currentRow.children).indexOf(currentCell);
            event.target.blur();
            for (let i = currentRowIndex + 1; i < allRows.length; i++) {
                const nextCell = allRows[i].cells[currentCellIndex];
                if (nextCell) {
                    const nextInput = nextCell.querySelector('input[type="text"]');
                    if (nextInput) {
                        nextInput.focus();
                        return;
                    }
                }
            }
        }
    });
    
    contentsContainer.addEventListener('dblclick', (event) => {
        if(event.target.matches('.sales-price')) {
            const expression = event.target.dataset.formula || event.target.value;
            const calculatedValue = evaluateMath(expression).toString();
            copyToClipboard(calculatedValue, '?곹뭹媛');
        } else if(event.target.matches('.copy-customer-info-btn')) {
             const inputElement = event.target.closest('div').querySelector('input');
             copyToClipboard(inputElement.value, '怨좉컼?뺣낫');
        }
    });
    
    document.getElementById('ipActivityForm').addEventListener('submit', ip_handleActivityFormSubmit);
    const ipAttractionSearchInput = document.getElementById('ipAttractionSearchInput');
    if (ipAttractionSearchInput) {
        ipAttractionSearchInput.addEventListener('input', ip_renderFilteredAttractionList);
    }
    
    document.addEventListener('mousedown', (e) => {
        if (e.target.matches('.resizer-handle')) {
            e.preventDefault(); // Prevent text selection
            const splitContainer = e.target.closest('.split-container');
            const pnrPane = splitContainer.querySelector('.pnr-pane');
            const quotePane = splitContainer.querySelector('.quote-pane');
            const resizer = e.target;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            // ?꾩옱 ?덈퉬媛믪씠 ?놁쑝硫?珥덇린??(??踰덉㎏ 由ъ궗?댁쫰瑜??꾪빐)
            if (!pnrPane.style.width || pnrPane.style.width === 'auto') {
                const currentPnrWidth = pnrPane.offsetWidth;
                const currentQuoteWidth = quotePane.offsetWidth;
                pnrPane.style.width = currentPnrWidth + 'px';
                quotePane.style.width = currentQuoteWidth + 'px';
            }

            // Temporarily disable flex-grow/shrink to set widths explicitly
            pnrPane.style.flex = 'none';
            quotePane.style.flex = 'none';

            const onMouseMove = (moveEvent) => {
                const rect = splitContainer.getBoundingClientRect();
                let pnrWidth = moveEvent.clientX - rect.left;

                const minPnrWidth = 150;
                const minQuoteWidth = 280;  // 250 ??280: ?꾩옱 ?ㅽ겕由곗꺑 湲곗? 理쒖쟻 ?ш린
                const resizerWidth = resizer.offsetWidth;

                // Clamp the pnrWidth to its min and max based on the container and quote pane min-width
                if (pnrWidth < minPnrWidth) {
                    pnrWidth = minPnrWidth;
                }
                if (pnrWidth > rect.width - minQuoteWidth - resizerWidth) {
                    pnrWidth = rect.width - minQuoteWidth - resizerWidth;
                }

                const quoteWidth = rect.width - pnrWidth - resizerWidth;

                // Set explicit widths on both panes
                pnrPane.style.setProperty('width', pnrWidth + 'px', 'important');
                quotePane.style.setProperty('width', quoteWidth + 'px', 'important');
            };
            
            const onMouseUp = () => {
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';

                // flex ?띿꽦 蹂듭썝 (width???좎?)
                pnrPane.style.flex = '0 0 auto';  // width 湲곕컲?쇰줈 怨좎젙 ?ш린 ?좎?
                quotePane.style.flex = '0 0 auto'; // width 湲곕컲?쇰줈 怨좎젙 ?ш린 ?좎?
                
                // width???쒓굅?섏? ?딄퀬 ?좎? (?ㅼ쓬 由ъ궗?댁쫰瑜??꾪빐 ?꾩슂)
                // pnrPane.style.removeProperty('width');  // 二쇱꽍 泥섎━
                // quotePane.style.removeProperty('width'); // 二쇱꽍 泥섎━

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.target.matches('input, textarea')) return;
        if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
            switch (event.code) {
                case 'F2': event.preventDefault(); document.getElementById('saveBtn').click(); break;
                case 'F3': event.preventDefault(); document.getElementById('saveAsBtn').click(); break;
                case 'F4': event.preventDefault(); document.querySelector('label[for="loadFile"]').click(); break;
            }
        }
        if (event.shiftKey) {
            switch (event.code) {
                case 'KeyY': event.preventDefault(); document.getElementById('recentFilesBtn')?.click(); break;
                case 'KeyN': event.preventDefault(); document.getElementById('newWindowBtn').click(); break;
            }
        }
    });
    
    // 珥덇린 濡쒕뱶 ???뚰겕?ㅽ럹?댁뒪 ?대깽??由ъ뒪??諛붿씤??
    rebindWorkspaceEventListeners();
}

document.addEventListener('DOMContentLoaded', () => {
    initDB();

    recentFilesModal = document.getElementById('recentFilesModal');
    recentFileSearchInput = document.getElementById('recentFileSearchInput');
    recentFileListUl = document.getElementById('recentFileList');
    loadingRecentFileListMsg = document.getElementById('loadingRecentFileListMsg');
    cancelRecentFilesModalButton = document.getElementById('cancelRecentFilesModalButton');
    closeRecentFilesModalButton = document.getElementById('closeRecentFilesModalButton');
    
    const urlParams = new URLSearchParams(window.location.search);
    const loadDataKey = urlParams.get('loadDataKey');
    
    if (loadDataKey) {
        const restoredDataJSON = sessionStorage.getItem(loadDataKey);
        sessionStorage.removeItem(loadDataKey);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('loadDataKey');
        history.replaceState({}, '', newUrl);
        if (restoredDataJSON) {
            try {
                const restoredData = JSON.parse(restoredDataJSON);
                restoreState(restoredData);
            } catch(e) { console.error("?몄뀡 ?곗씠???뚯떛 ?ㅽ뙣:", e); initializeNewSession(); }
        } else { 
            // ?뚯씪 ???쒖뒪??珥덇린??
            initializeNewSession();
        }
    } else {
        const restoredDataScript = document.getElementById('restored-data');
        let restoredData = null;
        if (restoredDataScript && restoredDataScript.textContent.trim()) {
            try { restoredData = JSON.parse(restoredDataScript.textContent); }
            catch (e) { console.error("????곗씠???뚯떛 ?ㅽ뙣:", e); restoredData = null; }
        }
        if (restoredData) { restoreState(restoredData); } 
        else { initializeNewSession(); }
    }
    setupEventListeners();
    
    // 湲곗〈 ?붿냼?ㅼ뿉 ?댄똻 異붽?
    setTimeout(() => {
        addTooltipsToExistingElements();
    }, 100);
});

// 湲곗〈 ?붿냼?ㅼ뿉 ?댄똻 異붽??섎뒗 ?⑥닔
function addTooltipsToExistingElements() {
    // 鍮꾩슜 ???쇰꺼??
    document.querySelectorAll('.cost-row-label-span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
    
    // ?몄썝 ????대쫫??
    document.querySelectorAll('.person-type-name-span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
    
    // ?몄썝 ?섎뱾
    document.querySelectorAll('.person-count-span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
    
    // ?숈쟻 ???쇰꺼??
    document.querySelectorAll('.dynamic-row-label-span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
    
    // PNR ?쒕ぉ
    document.querySelectorAll('.pnr-title-span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
    
    // 寃ъ쟻 洹몃９ ??뱾
    document.querySelectorAll('.quote-tab span:not([title])').forEach(el => {
        el.setAttribute('title', '?붾툝?대┃?섏뿬 ?섏젙 媛??);
    });
}

