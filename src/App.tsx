import {Route, Routes} from "react-router-dom";
import {Main, NotFound, Room} from "./pages";

function App() {

  return (
    <div>
      <Routes>
          <Route path={'/'} element={<Main />} />
          <Route path={'/room/:id'} element={<Room />} />
          <Route path={'*'} element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
