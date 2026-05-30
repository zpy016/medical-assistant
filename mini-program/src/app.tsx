import { useLaunch } from '@tarojs/taro'
import './app.css'

function App({ children }) {
  useLaunch(() => {
    console.log('就医助手小程序启动')
  })

  return children
}

export default App
