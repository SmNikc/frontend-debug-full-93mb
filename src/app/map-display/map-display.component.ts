import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

@Component({
  selector: 'app-map-display',
  template: `
    <mat-progress-bar mode="determinate" [value]="progress" *ngIf="progress < 100"></mat-progress-bar>
    <div id="map" style="height: 500px; width: 100%;"></div>
  `,
  styles: []
})
export class MapDisplayComponent implements OnInit {
  map!: Map;
  progress: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadGeoJSON();
  }

  loadGeoJSON(): void {
    const url = 'assets/northwest_russia_currents.geojson';
    this.http.get(url, { observe: 'events', reportProgress: true }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.DownloadProgress) {
          this.progress = Math.round((event.loaded / (event.total || 1)) * 100);
        } else if (event.type === HttpEventType.Response) {
          const geojsonData = event.body;
          const vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(geojsonData, {
              featureProjection: 'EPSG:3857'
            })
          });

          const vectorLayer = new VectorLayer({
            source: vectorSource
          });

          this.map = new Map({
            target: 'map',
            layers: [
              new TileLayer({
                source: new OSM() // Базовый слой OpenStreetMap
              }),
              new TileLayer({
                source: new XYZ({
                  url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png' // Слой OpenSeaMap
                })
              }),
              vectorLayer
            ],
            view: new View({
              center: [4185000, 11000000], // Центр региона (lon: 37.5, lat: 73) в EPSG:3857
              zoom: 5.5 // Уменьшенный зум для более широкого охвата
            })
          });
        }
      },
      error: (err) => console.error('Ошибка загрузки GeoJSON:', err)
    });
  }
}