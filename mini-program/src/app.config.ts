export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/upload/index',
    'pages/ocrConfirm/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/abnormalTests/index',
    'pages/abnormalTestDetail/index',
    'pages/medications/index',
    'pages/medicationForm/index',
    'pages/vaccines/index',
    'pages/familyDashboard/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3b82f6',
    navigationBarTitleText: '就医助手',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#3b82f6',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/upload/index',
        text: '上传'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的'
      }
    ]
  },
  permission: {
    'scope.camera': {
      desc: '用于拍摄病历和诊断单'
    }
  }
})
