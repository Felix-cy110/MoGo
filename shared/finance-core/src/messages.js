export const supportedLanguages = Object.freeze(['zh', 'en']);
export const defaultLanguage = 'zh';

export const financeMessages = Object.freeze({
  zh: Object.freeze({
    appName: 'MoGo',
    appSubtitle: '个人财务管理',
    metaDescription: '简单、清晰的每日消费管理工具',
    language: '语言',
    languageZh: '中文',
    languageEn: 'English',
    switchToLightTheme: '开灯',
    switchToDarkTheme: '关灯',
    today: '今天',
    budget: '每日预算',
    budgetPlaceholder: '输入今日最多可花金额',
    saveBudget: '保存预算',
    spent: '已消费',
    remaining: '剩余预算',
    usage: '预算使用率',
    addExpense: '记一笔',
    amount: '金额',
    amountWithCurrency: '金额（元）',
    budgetWithCurrency: '每日预算（元）',
    amountPlaceholder: '例如 25.50',
    category: '分类',
    manageCategories: '管理分类',
    addCategory: '添加分类',
    categoryName: '分类名称',
    categoryNamePlaceholder: '例如：日用品',
    categoryNameRequired: '请输入分类名称',
    categoryNameExists: '该分类名称已经存在',
    customCategoryHint: '新增后会直接出现在记账分类中，备注默认为选填',
    cancel: '取消',
    note: '备注',
    noteOptional: '备注（选填）',
    noteRequiredLabel: '备注（必填）',
    notePlaceholder: '写点说明（可选）',
    noteRequired: '该分类必须填写备注',
    invalidAmount: '请输入大于 0 的消费金额',
    submit: '保存记录',
    recentExpenses: '今日记录',
    noExpenses: '今天还没有消费记录',
    noNote: '无备注',
    categorySummary: '分类汇总',
    noCategoryData: '暂无分类数据',
    count: '笔数',
    warning: '预算预警',
    alertWarning: '今天的消费已达到每日预算的 80%。',
    alertExceeded: '今天已经超出每日预算，请注意控制消费。',
    confirm: '知道了',
    budgetMissing: '请先设置今日预算',
    saved: '已保存',
    loadFailed: '数据加载失败，请确认后端服务已启动',
    saveFailed: '保存失败，请稍后重试',
    requestFailed: '请求失败，请稍后重试',
    validationError: '请检查提交的数据',
    categoryNotFound: '所选分类不可用',
    currency: '元',
    categoryMeal: '正餐',
    categoryCommute: '通勤',
    categorySnack: '随心吃',
    categoryOther: '其他'
  }),
  en: Object.freeze({
    appName: 'MoGo',
    appSubtitle: 'Personal Finance',
    metaDescription: 'A simple daily spending and budget tracker',
    language: 'Language',
    languageZh: '中文',
    languageEn: 'English',
    switchToLightTheme: 'Turn on the lights',
    switchToDarkTheme: 'Turn off the lights',
    today: 'Today',
    budget: 'Daily budget',
    budgetPlaceholder: 'Enter today’s spending limit',
    saveBudget: 'Save budget',
    spent: 'Spent',
    remaining: 'Remaining',
    usage: 'Budget used',
    addExpense: 'Add expense',
    amount: 'Amount',
    amountWithCurrency: 'Amount (CNY)',
    budgetWithCurrency: 'Daily budget (CNY)',
    amountPlaceholder: 'e.g. 25.50',
    category: 'Category',
    manageCategories: 'Manage categories',
    addCategory: 'Add category',
    categoryName: 'Category name',
    categoryNamePlaceholder: 'e.g. Household',
    categoryNameRequired: 'Enter a category name',
    categoryNameExists: 'A category with this name already exists',
    customCategoryHint: 'New categories appear immediately and notes are optional by default',
    cancel: 'Cancel',
    note: 'Note',
    noteOptional: 'Note (optional)',
    noteRequiredLabel: 'Note (required)',
    notePlaceholder: 'Add a note (optional)',
    noteRequired: 'A note is required for this category',
    invalidAmount: 'Enter an amount greater than zero',
    submit: 'Save expense',
    recentExpenses: 'Today’s expenses',
    noExpenses: 'No expenses recorded today',
    noNote: 'No note',
    categorySummary: 'Category summary',
    noCategoryData: 'No category data',
    count: 'Count',
    warning: 'Budget alert',
    alertWarning: 'Today’s spending has reached 80% of the daily budget.',
    alertExceeded: 'Today’s spending has exceeded the daily budget.',
    confirm: 'Got it',
    budgetMissing: 'Set today’s budget first',
    saved: 'Saved',
    loadFailed: 'Unable to load data. Make sure the backend is running.',
    saveFailed: 'Unable to save. Please try again.',
    requestFailed: 'Request failed. Please try again.',
    validationError: 'Please check the submitted data',
    categoryNotFound: 'The selected category is unavailable',
    currency: 'CNY',
    categoryMeal: 'Meals',
    categoryCommute: 'Commute',
    categorySnack: 'Snacks',
    categoryOther: 'Other'
  })
});

export const zhFinanceMessages = financeMessages.zh;
export const enFinanceMessages = financeMessages.en;

export const categoryMessageKeys = Object.freeze({
  'category.meal': 'categoryMeal',
  'category.commute': 'categoryCommute',
  'category.snack': 'categorySnack',
  'category.other': 'categoryOther'
});

export const apiErrorMessageKeys = Object.freeze({
  CATEGORY_NOT_FOUND: 'categoryNotFound',
  NOTE_REQUIRED: 'noteRequired',
  VALIDATION_ERROR: 'validationError',
  REQUEST_FAILED: 'requestFailed',
  CATEGORY_NAME_EXISTS: 'categoryNameExists'
});

export const resolveCategoryMessageKey = (category) =>
  categoryMessageKeys[category?.i18nKey] || categoryMessageKeys[`category.${category?.code?.toLowerCase()}`];

export const resolveApiErrorMessageKey = (code) => apiErrorMessageKeys[code] || 'requestFailed';

export const alertMessageKeys = Object.freeze({
  'alert.budget.warning': 'alertWarning',
  'alert.budget.exceeded': 'alertExceeded'
});

export const resolveAlertMessageKey = (alert) =>
  alertMessageKeys[alert?.messageKey] || (alert?.thresholdPercent >= 100 ? 'alertExceeded' : 'alertWarning');
