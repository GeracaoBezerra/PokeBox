import { Outlet } from 'react-router-dom';
import Header from '../header/header'
import Footer from '../footer/footer'

function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

export default MainLayout