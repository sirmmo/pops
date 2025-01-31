import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

declare const maplibregl: any;
declare const Papa: any;
declare const echarts: any; 


const NUTS :{[key: string]: string} = {
  '2': '/assets/nuts2.geojson',
  '3': '/assets/nuts3.geojson'
}

const NUTSLYR: {[key: string]: string} = {

}

const YEARS: {[key: string]: number[]} = {
  "eu": [1996, 1999, 2004, 2009, 2014, 2019],
  "national": [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019],
  "joint": [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]
}

const ELECTIONS: {[key: string]: string} ={
  "eu": "/assets/eu_ned_ep_nuts2.csv",
  "national": "/assets/eu_ned_national_nuts2.csv",
  "joint": "/assets/eu_ned_joint_nuts2.csv",
}

const FIELD: {[key: string]: string} ={
  "eu": "winnerE_party_english",
  "national": "winnerE_party_english",
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, CommonModule ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  constructor(
    private h: HttpClient
  ){}
  map?: any;


  public tl = 'eu';
  public nuts = 2;
  public showyear?:number;
  private nutsFile: string = "/assets/nuts2.geojson";
  public selectedYears  = YEARS[this.tl];
  private electionsFile: string = ELECTIONS[this.tl];

  selected: string = '';
  region?:any = null;
  votesN:any[] = [];
  votesE:any[] = [];

  @ViewChild('chart') chartDom?: ElementRef;
  myChart: any = {};
  
  ngAfterViewInit(): void {
    this.map = new maplibregl.Map({
      container: 'map', // container id
      style: 'https://api.maptiler.com/maps/dataviz/style.json?key=d4riErcNxikqFtGgs7GY',
        center: [12, 50], // starting position [lng, lat]
        zoom: 4, // starting zoom
        hash: true,
    });

    this.map.on('load', () => {
      this.map.addSource('nuts2', {
        'type': 'geojson',
        'data': this.nutsFile
      });

      this.map.addLayer({
        'id': 'nuts2_base',
        'type': 'fill',
        'source': 'nuts2',
        'paint': {
          'fill-color': 'gray',
          'fill-outline-color': 'gray',
          'fill-opacity': 0.4,
      }
      });
      this.map.addLayer({
        'id': 'nuts2_labels',
        'type': 'symbol',
        'source': 'nuts2',
        'layout': {
          'text-field': ["get", 'winnerE_party_english'],
          'text-size': 10,
      }
    });

    this.map.on('click', 'nuts2_base', (e:any) => {
      this.votesN = JSON.parse(e.features[0].properties.votesN);
      this.votesE = JSON.parse(e.features[0].properties.votesE);
      this.region = e.features[0].properties;
      this.selected = e.features[0].properties.NUTS_ID;
      })
    });

  } 

  setTl(tl: string){
    this.tl  =tl;
    this.selectedYears = YEARS[tl];
    this.showyear = this.selectedYears[0];
    this.electionsFile = ELECTIONS[tl];
    this.update();
    this.updateView()
  }

  setNuts(level: number){
    this.votesN = [];
    this.votesE = [];
    this.region = {};
    this.nuts = level;
    this.nutsFile = NUTS[level.toString()]
    this.update();
  }

  show(year: number){
    this.showyear = year;
    this.votesN = [];
    this.votesE = [];
    this.region = {};
    this.update();
  }

  updateView(){
    this.map.setLayoutProperty('nuts2_labels','text-field', ["get", FIELD[this.tl]], )
  }

  update(){
    Papa.parse(this.electionsFile, {
      download: true,
      header: true,
      complete: (results:any) => {
        const data = results.data.filter((d: any) => d.year == this.showyear);
        this.h.get(this.nutsFile).subscribe((geoj:any) =>{
          geoj.features.map((f: any) => {
            f.properties.votesN = data.filter((d:any) => d.type==='Parliament' && d.nuts2 === f.properties.NUTS_ID).sort((a:any, b:any)=>b.partyvote-a.partyvote);
            f.properties.votesE = data.filter((d:any) => d.type==='EP' && d.nuts2 === f.properties.NUTS_ID).sort((a:any, b:any)=>b.partyvote-a.partyvote);
            f.properties.winnerN = f.properties.votesN[0];
            f.properties.winnerE = f.properties.votesE[0];
            f.properties.winnerN_party_english = f.properties.winnerN?.party_abbreviation;
            f.properties.winnerE_party_english = f.properties.winnerE?.party_abbreviation;

            if (this.selected.length > 0){
              if (f.properties.NUTS_ID === this.selected){
                this.votesN = f.properties.votesN;
                this.votesE = f.properties.votesE;
                this.region = f.properties;
              }
            }
            
            return f;
          })
          console.log(geoj);
          this.map?.getSource('nuts2').setData(geoj);
    });
  }
  });
  }

}
