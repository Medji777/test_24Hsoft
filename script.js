(()=>{
    const geoUtil = {
        midRadius: 6372, // средний радиус Земли
        RAD: Math.PI / 180, // коэффициент для перевода из градусов широты и долготы в рады.
        toDistance(x,y,X,Y) {
           return  this.midRadius * Math.acos(Math.sin(y * this.RAD) * Math.sin(Y * this.RAD) +
                Math.cos(y * this.RAD) * Math.cos(Y * this.RAD) * Math.cos((X * this.RAD) - (x * this.RAD)))
        }
    };
    const api = {
        async getAirplanes(){ // Запрашиваем данные с сервера
            let res = await  fetch('https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48',{
                method: 'GET'
            });
            return res.json();
        }
    };
    const view = {
        _settings: {resetInterval: 4000},
        render(data){  // Отрисовываем информацию в таблице
            let div = document.querySelector('#root');
            let elHTML = '';
            elHTML = `<table class="main">`;
            elHTML += `<tr class="th">`;
            for(let i = 0; i < data.tableHead.length;i++){
                elHTML += `<th>${data.tableHead[i]}</th>`
            }
            elHTML += `</tr>`;
            data.airplanes.forEach(r => {
                let ch = (props) => props ? props : '-';
                elHTML += `<tr class="tb">
                    <td>${ch(r.flightNumber)}</td>
                    <td>${ch(r.lat)}</td>
                    <td>${ch(r.lng)}</td>
                    <td>${ch(r.speed)}</td>
                    <td>${ch(r.course)}</td>
                    <td>${ch(r.heightFlight)}</td>
                    <td>${ch(r.out)}</td>
                    <td>${ch(r.in)}</td>   
                </tr>`
                // <span>${r.ds}</span> - для вывода информации о расстоянии от аэропорта до самолета
            });
            elHTML += `</table>`;
            div.innerHTML = elHTML;
        },
        showError(err){
            let div = document.querySelector('#root');
            let body = div.parentElement;
            let divError = document.querySelector('.error');
            if(!divError){
                this._createError(body,div,err);
            } else {
                this._removeErrorElement(divError);
            }
        },
        _createError(body,div,err){
            let elDiv = document.createElement('div');
            elDiv.classList.add('error');
            body.insertBefore(elDiv, div);
            this._createTextError(err);
        },
        _createTextError(err){
            let divError = document.querySelector('.error');
            let elDiv = document.createElement('div');
            elDiv.innerText = err;
            divError.style.background = '#ff8c8c';
            divError.appendChild(elDiv);
            this._resetError(divError);
        },
        _removeErrorElement(el){
            el.remove()
        },
        _resetError(el){
            setTimeout(()=>{this._removeErrorElement(el)},this._settings.resetInterval)
        }
    };
    const app = {
        _settings: {refreshInterval: 5000},
        _state: {
            initPlanes: null,
            airplanes: [],
            tableHead: ['Номер рейса', 'lat','lng','Скорость, (км/ч)','Курс, (°)','Высота полета, (м)','Вылет','Посадка'],
            ratioSpeed: 1.875, //  коэффициент перевода из узлов в км.ч
            ratioHeight: 3.281, // коэффициент перевода из футов в м
            airport: {
                lat: 55.410307,
                lng: 37.902451
            }
        },
        getState(){
            return this._state
        },
        async init() {
            await this.run();
            this._startInterval();
        },
        async _startInterval() {
            setTimeout(async () => {
                await this.run();
                this._startInterval();
            }, this._settings.refreshInterval);
        },
        async run(){
            await this.setPlanes();
            await this.getPlanes();
            await this.sortByDistance();
            view.render(this._state);
        },
        getPlanes(){  // Создаем итоговый объект с выводом информации
            let {initPlanes,airport,ratioSpeed,ratioHeight} = this._state;
            let Y = airport.lat;
            let X = airport.lng;
            let airplanes = [];
            for(let i in initPlanes) {
                if (initPlanes.hasOwnProperty(i)) {
                let airplane = initPlanes[i];
                if (typeof airplane === 'object') { // Только если значения будут типа object
                    airplanes.push({
                        lat: airplane[1],
                        lng: airplane[2],
                        flightNumber: airplane[13],
                        speed: Number((airplane[5] * ratioSpeed).toFixed(1)), // Скорость в км ч
                        course: airplane[3],
                        heightFlight: (airplane[4] / ratioHeight).toFixed(), // Высота в м.
                        out: airplane[11],
                        in: airplane[12],
                        // distance(ds) - расстояние от самолета до аэропорта
                        ds: geoUtil.toDistance(airplane[2],airplane[1],X,Y)
                    })
                }
            }
            }
            this._state = {...this._state,airplanes: airplanes};
        },
        sortByDistance(){
            // Сортируем по увеличению расстояния от аэропорта
            this._state = {...this._state, airplanes: this._state.airplanes.sort((a,b) => a.ds - b.ds)};
        },
        async setPlanes(){
            try {
                let res = await api.getAirplanes();
                this._state = {...this._state, initPlanes: {...res}}; // Получаем данные с сервера и записываем в initPlanes
            }
            catch (e) {
                //console.error(e.message);
                view.showError("some error has occurred");
            }
        }

    };
    window.addEventListener('DOMContentLoaded',app.init.bind(app));
})();