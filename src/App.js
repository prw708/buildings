import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './main.css';
import Layout from './components/Layout';
import Home from './components/Home';
import AddForm from './components/AddForm';
import DeleteForm from './components/DeleteForm';
import AdditionsForm from './components/AdditionsForm';
import DeletionsForm from './components/DeletionsForm';
import Pending from './components/Pending';
import Building from './components/Building';
import NotFound from './components/NotFound';

function App(props) {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [updateMessage, setUpdateMessage] = useState(0);
  const [status, setStatus] = useState('idle');
  const [updateMessageTimeout, setUpdateMessageTimeout] = useState(null);

  return (
    <React.Fragment>
      <BrowserRouter>
        <Routes>
          <Route path="/projects/buildings/" element={<Layout 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              successMessage={successMessage} 
              errorMessage={errorMessage} 
          />}>
            <Route index element={<Home 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="add" element={<AddForm 
              {...props} 
              update={false}
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="delete" element={<DeleteForm 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="additions" element={<AdditionsForm 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="deletions" element={<DeletionsForm 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="pending/:buildingId" element={<Pending
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="building/:buildingId" element={<Building 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="edit/:buildingId" element={<AddForm 
              {...props} 
              update={true}
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
            <Route path="*" element={<NotFound 
              {...props} 
              status={status}
              setStatus={setStatus}
              updateMessage={updateMessage}
              setUpdateMessage={setUpdateMessage}
              updateMessageTimeout={updateMessageTimeout}
              setUpdateMessageTimeout={setUpdateMessageTimeout}
              setSuccessMessage={setSuccessMessage}
              setErrorMessage={setErrorMessage}
            />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.Fragment>
  );
}

export default App;
