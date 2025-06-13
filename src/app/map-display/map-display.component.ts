import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

@Component({
  selector: 'app-map-display',
  template: \`
    <mat-progress-bar mode="determinate" [value]="progress" *ngIf="progress < 100"></mat-progress-bar>
    <div id="map" style="height: 500px; width: 100%;"></div>
  \`,
  styles: []
})
export class MapDisplayComponent implements OnInit {
  map!: Map;
  progress = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadGeoJSON();
  }

  loadGeoJSON(): void {
    const url = 'assets/northwest_russia_currents.geojson';
    this.http.get(url, { observe: 'events', reportProgress: true }).subscribe({
      next: (event: any) => {
        if (event.type === 3) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        } else if (event.type === 4) {
          const geojsonData = event.body;
          const vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(geojsonData)
          });
          const vectorLayer = new VectorLayer({ source: vectorSource });
          this.map = new Map({
            target: 'map',
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view: new View({ center: [0, 0], zoom: 2 })
          });
        }
      },
      error: (err) => console.error('GeoJSON load error:', err)
    });
  }
}