import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';

export default function AddForm(props) {
  const navigate = useNavigate();
  let params = useParams();

  useEffect(() => {
    if (params.buildingId) {
      getBuilding();
    } else {
      setBuilding(null);
      setName('');
      setOccupancy('');
      setType('R-$');
      setTiles([]);
      setStyle('None');
      setImage('');
      setNameValid(true);
      setOccupancyValid(true);
      setTypeValid(true);
      setTilesValid(true);
      setStyleValid(true);
      setImageValid(true);
    }
  }, []);

  useEffect(() => {
    clearTimeout(props.updateMessageTimeout);
    props.setUpdateMessageTimeout(setTimeout(() => {
      props.setSuccessMessage('');
      props.setErrorMessage('');
    }, 3000));
  }, [props.updateMessage]);

  const [building, setBuilding] = useState(null);

  const [name, setName] = useState('');
  const [nameValid, setNameValid] = useState(true);
  const [occupancy, setOccupancy] = useState('');
  const [occupancyValid, setOccupancyValid] = useState(true);
  const [type, setType] = useState('R-$');
  const [typeValid, setTypeValid] = useState(true);
  const [tiles, setTiles] = useState([]);
  const [tilesValid, setTilesValid] = useState(true);
  const [style, setStyle] = useState('None');
  const [styleValid, setStyleValid] = useState(true);
  const [image, setImage] = useState('');
  const [imageValid, setImageValid] = useState(true);

  const onNameChanged = (e) => setName(e.target.value);
  const onOccupancyChanged = (e) => setOccupancy(e.target.value);
  const onTypeChanged = (e) => setType(e.target.value);
  const onTilesChanged = (e) => setTiles(() => [...e.target.options].filter(el => el.selected).map(el => el.value));
  const onStyleChanged = (e) => setStyle(e.target.value);
  const onImageChanged = (e) => setImage(e.target.value);

  const validate = () => {
    let nameValidity = false, 
        occupancyValidity = false, 
        typeValidity = false, 
        tilesValidity = false, 
        styleValidity = false, 
        imageValidity = false;
    const TYPES = [
      'R-$', 'R-$$', 'R-$$$', 
      'CS-$', 'CS-$$', 'CS-$$$', 
      'CO-$$', 'CO-$$$', 
      'I-AG', 'I-D', 'I-M', 'I-HT'
    ];
    const TILES = [
      '1x1', '1x2', '1x3', '1x4', 
      '2x1', '2x2', '2x3', '2x4', 
      '3x1', '3x2', '3x3', '3x4', 
      '4x1', '4x2', '4x3', '4x4'
    ];
    const STYLES = [
      'None', 
      '1890 Chicago', 
      '1940 New York', 
      '1990 Houston', 
      'Euro Contemporary'
    ];
    if (/^[A-Za-z0-9 .,_"'()\\-]{1,200}$/.test(name)) {
      setNameValid(true);
      nameValidity = true;
    } else {
      setNameValid(false);
      nameValidity = false;
    }
    if (/^[0-9]{1,4}$/.test(occupancy)) {
      setOccupancyValid(true);
      occupancyValidity= true;
    } else {
      setOccupancyValid(false);
      occupancyValidity = false;
    }
    if (TYPES.find(el => el === type)) {
      setTypeValid(true);
      typeValidity= true;
    } else {
      setTypeValid(false);
      typeValidity = false;
    }
    if (tiles.length > 0 && tiles.every(el => TILES.find(t => el === t) !== undefined)) {
      setTilesValid(true);
      tilesValidity= true;
    } else {
      setTilesValid(false);
      tilesValidity = false;
    }
    if (STYLES.find(el => el === style)) {
      setStyleValid(true);
      styleValidity= true;
    } else {
      setStyleValid(false);
      styleValidity = false;
    }
    if (/^[A-Za-z0-9 _,.\\:-]{0,200}$/.test(image)) {
      setImageValid(true);
      imageValidity = true;
    } else {
      setImageValid(false);
      imageValidity = false;
    }
    if (nameValidity && occupancyValidity && typeValidity && tilesValidity && styleValidity && imageValidity) {
      props.setErrorMessage('');
    } else {
      if (building) {
        props.setErrorMessage('There are errors in the Update Building form.');
      } else {
        props.setErrorMessage('There are errors in the Add Building form.');
      }
    }
    return nameValidity && occupancyValidity && typeValidity && tilesValidity && styleValidity && imageValidity;
  };

  const onAddClick = (e) => {
    e.preventDefault();
    if (validate()) {
      props.setStatus('loading');
      let httpRequest = new XMLHttpRequest();
      if (!httpRequest) {
        return null;
      }
      let data = new FormData();
      data.append('id', DOMPurify.sanitize(params.buildingId));
      data.append('name', DOMPurify.sanitize(name));
      data.append('occupancy', DOMPurify.sanitize(occupancy));
      data.append('type', DOMPurify.sanitize(type));
      for (const el of tiles) {
        data.append('tiles[]', DOMPurify.sanitize(el));
      }
      data.append('style', DOMPurify.sanitize(style));
      data.append('time', DOMPurify.sanitize(props.time));
      if (image) {
        data.append('image', document.getElementById('aFile').files[0]);
      } else {
        data.append('image', null);
      }
      window.grecaptcha.ready(function() {
        window.grecaptcha.execute(DOMPurify.sanitize(props.recaptchaSiteKey), { action: 'add' })
        .then(function(recaptchaToken) {
          data.append('g-recaptcha-response', DOMPurify.sanitize(recaptchaToken));
          httpRequest.open('POST', '/projects/buildings/add', true);
          httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          httpRequest.setRequestHeader('CSRF-Token', DOMPurify.sanitize(props.csrfToken));
          httpRequest.send(data);
        })
        .catch(function(error) {
          props.setSuccessMessage('');
          props.setErrorMessage(error);
          props.setStatus('idle');
          props.setUpdateMessage(prev => prev + 1);
        });
      });
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          if (httpRequest.status === 200) {
            if (building) {
              props.setSuccessMessage('Update awaiting approval!');
            } else {
              props.setSuccessMessage('Addition awaiting approval!');
            }
            props.setErrorMessage('');
            props.setStatus('success');
            props.setUpdateMessage(prev => prev + 1);
            navigate("/projects/buildings");
            window.scrollTo(0, 0);
          } else {
            let errors;
            try {
              errors = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
            } catch (error) {
              errors = null;
            }
            props.setSuccessMessage('');
            if (building) {
              props.setErrorMessage('There are errors in the Update Building form.');
            } else {
              props.setErrorMessage('There are errors in the Add Building form.');
            }
            if (!errors || errors.length === 0) {
              props.setErrorMessage('An error occurred adding the building.');
            } else {
              for (const e of errors) {
                if (e.param === "name") {
                  setNameValid(false);
                } else if (e.param === "occupancy") {
                  setOccupancyValid(false);
                } else if (e.param === "type") {
                  setTypeValid(false);
                } else if (e.param.indexOf("tiles") !== -1) {
                  setTilesValid(false);
                } else if (e.param === "style") {
                  setStyleValid(false);
                } else if (e.param === "image") {
                  setImageValid(false);
                } else if (e.param === "addBuildingMessage") {
                  props.setErrorMessage(e.msg);
                }
              }
            }
            props.setStatus('idle');
            props.setUpdateMessage(prev => prev + 1);
            window.scrollTo(0, 0);
          }
        }
      };
    }
    window.scrollTo(0, 0);
  };

  const getBuilding = () => {
    props.setStatus('loading');
    let httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
      return null;
    }
    httpRequest.open('GET', '/projects/buildings/get/' + params.buildingId, true);
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    httpRequest.send();
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          let building = JSON.parse(DOMPurify.sanitize(httpRequest.responseText));
          setBuilding(building);
          setName(building.name);
          setOccupancy(building.occupancy);
          setType(building.type);
          setTiles(building.tiles);
          setStyle(building.style);
        } else {
          setBuilding(null);
          setName('');
          setOccupancy('');
          setType('R-$');
          setTiles([]);
          setStyle('None');
          setImage('');
          setNameValid(true);
          setOccupancyValid(true);
          setTypeValid(true);
          setTilesValid(true);
          setStyleValid(true);
          setImageValid(true);
          props.setSuccessMessage('');
          props.setErrorMessage('An error occurred while getting the building.');
        }
        props.setStatus('idle');
        props.setUpdateMessage(prev => prev + 1);
      }
    };
  };

  if (!props.username) {
    props.setSuccessMessage('');
    if (props.update) {
      props.setErrorMessage('You must be logged in to update buildings.');
    } else {
      props.setErrorMessage('You must be logged in to add buildings.');
    }
    return (
      <React.Fragment>
        <h2 className="mb-4">{ props.update ? 'Update Building' : 'Add Building' }</h2>
        { (props.update) ? 
          <div className="alert alert-info mt-4 px-4">You must be <a href="/website/account/login" className="link-dark">logged in</a> to update a building.</div> :
          <div className="alert alert-info mt-4 px-4">You must be <a href="/website/account/login" className="link-dark">logged in</a> to add a building.</div>
        }
      </React.Fragment>
    );
  } else if (props.status === 'loading') {
    return (
      <React.Fragment>
        <div class="text-center m-4">
          <div className="spinner-border" role="status">
          </div>
        </div>
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <h2 className="mb-4">{ building ? 'Update Building' : 'Add Building' }</h2>
        <form>
          <div className="advanced-form mb-4">
            <label className="form-label" htmlFor="aEmail">Email</label>
            <input
              type="text"
              id="aEmail"
              className="form-control"
              defaultValue=""
              maxLength="50"
              autoComplete="off"
              tabIndex="-1"
            />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aPhone">Name</label>
            <input
              type="text"
              id="aPhone"
              className={!nameValid ? 'form-control is-invalid' : 'form-control'}
              value={name}
              onChange={onNameChanged}
              maxLength="200"
              autoComplete="off"
            />
            { !nameValid && <div className="invalid-feedback">
              Must be 1 to 200 characters. Can only contain A-Z, a-z, 0-9, spaces, and .,_"'()-.
              </div>
            }
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aFirstName">Occupancy</label>
            <input
              type="text"
              id="aFirstName"
              className={!occupancyValid ? 'form-control is-invalid' : 'form-control'}
              value={occupancy}
              onChange={onOccupancyChanged}
              maxLength="4"
              autoComplete="off"
            />
            { !occupancyValid && <div className="invalid-feedback">
              Must be a valid number.
              </div>
            }
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aWebsite">Type</label>
            <select
              id="aWebsite"
              className={!typeValid ? 'form-select is-invalid' : 'form-select'}
              value={type}
              onChange={onTypeChanged}
            >
              <option value="R-$">Low-Wealth Residential</option>
              <option value="R-$$">Medium-Wealth Residential</option>
              <option value="R-$$$">High-Wealth Residential</option>
              <option value="CS-$">Low-Wealth Commercial Service</option>
              <option value="CS-$$">Medium-Wealth Commercial Service</option>
              <option value="CS-$$$">High-Wealth Commercial Service</option>
              <option value="CO-$$">Medium-Wealth Commercial Office</option>
              <option value="CO-$$$">High-Wealth Commercial Office</option>
              <option value="I-AG">Industrial - Agriculture</option>
              <option value="I-D">Industrial - Dirty</option>
              <option value="I-M">Industrial - Manufacturing</option>
              <option value="I-HT">Industrial - High Tech</option>
            </select>
            { !typeValid && <div className="invalid-feedback">
              Must be a valid type.
              </div>
            }
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aLastName">Tiles</label>
            <select
              id="aLastName"
              className={!tilesValid ? 'form-select is-invalid' : 'form-select'}
              multiple
              size="3"
              value={tiles}
              onChange={onTilesChanged}
            >
              <option value="1x1">1x1</option>
              <option value="1x2">1x2</option>
              <option value="1x3">1x3</option>
              <option value="1x4">1x4</option>
              <option value="2x1">2x1</option>
              <option value="2x2">2x2</option>
              <option value="2x3">2x3</option>
              <option value="2x4">2x4</option>
              <option value="3x1">3x1</option>
              <option value="3x2">3x2</option>
              <option value="3x3">3x3</option>
              <option value="3x4">3x4</option>
              <option value="4x1">4x1</option>
              <option value="4x2">4x2</option>
              <option value="4x3">4x3</option>
              <option value="4x4">4x4</option>
            </select>
            { !tilesValid && <div className="invalid-feedback">
              Must be a valid tile type.
              </div>
            }
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aCreated">Style</label>
            <select
              id="aCreated"
              className={!styleValid ? 'form-select is-invalid' : 'form-select'}
              value={style}
              onChange={onStyleChanged}
            >
              <option value="None">None</option>
              <option value="1890 Chicago">1890 Chicago</option>
              <option value="1940 New York">1940 New York</option>
              <option value="1990 Houston">1990 Houston</option>
              <option value="Euro Contemporary">Euro Contemporary</option>
            </select>
            { !styleValid && <div className="invalid-feedback">
              Must be a valid style type.
              </div>
            }
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="aFile">Photo (1MB limit)</label>
            <input
              type="file"
              className={!imageValid ? 'form-control is-invalid' : 'form-control'}
              name="aFile"
              id="aFile" 
              onChange={onImageChanged}
              maxLength="200"
              autoComplete="off"
              accept="image/*"
            />
            { !imageValid && <div className="invalid-feedback">
              Must be a valid JPEG, GIF, or PNG.
              </div>
            }
          </div>
          <div className="pb-0">
            <button
              type="submit"
              className="btn btn-secondary g-recaptcha"
              onClick={onAddClick}
              disabled={props.status === 'loading' ? true : false}
            >
              { props.status === 'loading' && <span 
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
                ></span>
              }
              { (!building && props.status === 'loading') ? <span className="ps-2">Add</span> : '' }
              { (!building && props.status !== 'loading') ? <span>Add</span> : '' }
              { (building && props.status === 'loading') ? <span className="ps-2">Update</span> : '' }
              { (building && props.status !== 'loading') ? <span>Update</span> : '' }
            </button>
          </div>
        </form>
      </React.Fragment>
    );
  }
}
