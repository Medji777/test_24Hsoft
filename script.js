(()=>{
    const api = {
        getAirplanes(){ // Запрашиваем данные с сервера
            return fetch('https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48',{
                method: 'GET'
            })
        }
    };
    const view = {
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
        }
    };
    const app = {
        _state: {
            initPlanes: null,
            airplanes: [],
            tableHead: ['Номер рейса', 'lat','lng','Скорость, (км/ч)','Курс, (°)','Высота полета, (м)','Вылет','Посадка'],
            ratioSpeed: 1.875,
            ratioHeight: 3.281,
            midRadius: 6372,
            refreshInterval: 5000,
            airport: {
                lat: 55.410307,
                lng: 37.902451
            }
        },
        getState(){
            return this._state
        }, // Для доступа к state из вне и возможной расширяемости
        async init() {
            await this.run();
            setInterval(this.run.bind(this), this._state.refreshInterval);
        },
        async run(){
            await this.setPlanes();
            await this.getPlanes();
            await this.sortByDistance();
            view.render(this._state);
        },
        getPlanes(){  // Создаем итоговый объект с выводом информации
            let {initPlanes,airport,midRadius,ratioSpeed,ratioHeight} = this._state;
            let Y = airport.lat;
            let X = airport.lng;
            let RAD = Math.PI / 180; // коэффициент для перевода в рады.
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
                        ds: midRadius * Math.acos(Math.sin(airplane[1] * RAD) * Math.sin(Y * RAD) +
                                Math.cos(airplane[1] * RAD) * Math.cos(Y * RAD) * Math.cos((X * RAD) -
                                (airplane[2] * RAD)))
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
                res = await res.json();
                this._state = {...this._state, initPlanes: {...res}}; // Получаем данные с сервера и записываем в initPlanes
            }
            catch (e) {
                console.error(e.message)
            }
        }

    };
    window.addEventListener('DOMContentLoaded',app.init.bind(app));
})();