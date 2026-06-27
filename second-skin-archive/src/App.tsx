import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Start from "@/pages/Start";
import Home from "@/pages/Home";
import Body from "@/pages/Body";
import Wardrobe from "@/pages/Wardrobe";
import AddItem from "@/pages/AddItem";
import ClothingDetail from "@/pages/ClothingDetail";
import Journal from "@/pages/Journal";
import PeopleLikeMe from "@/pages/PeopleLikeMe";
import Archive from "@/pages/Archive";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* landing — no app chrome */}
        <Route path="/" element={<Start />} />

        {/* everything else lives inside the archive chrome */}
        <Route element={<Layout />}>
          <Route path="/start" element={<Home />} />
          <Route path="/today" element={<Home />} />
          <Route path="/body" element={<Body />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/item/:id" element={<ClothingDetail />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/people" element={<PeopleLikeMe />} />
          <Route path="/archive" element={<Archive />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
