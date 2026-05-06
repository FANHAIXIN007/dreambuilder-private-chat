"use client";

import React from "react";

type UiSet = {
 btnPrimary: string;
 btnSecondary: string;
};

type QuickCreateText = {
 quickCreate: string;
 createDream: string;
 inputArea: string;
 inputRooms: string;
 inputStyle: string;
 floorCount: string;
 houseType: string;
 facadeMaterial: string;
 roofType: string;
 roofColor: string;
 sceneType: string;
 tonePreference: string;
 garageOption: string;
 seasonOption: string;
 plotLocation: string;

 roomOptions: string[];
 styleOptions: string[];
 floorOptions: string[];
 houseTypeOptions: string[];
 facadeOptions: string[];
 roofOptions: string[];
 roofColorOptions: string[];
 sceneOptions: string[];
 toneOptions: string[];
 garageOptions: string[];
 seasonOptions: string[];

 [key: string]: unknown;
};

type QuickCreatePanelProps = {
 t: QuickCreateText;
 ui: UiSet;

 area: string;
 setArea: (value: string) => void;

 selectedRoomsKey: string;
 setSelectedRoomsKey: (value: string) => void;

 selectedStyleKey: string;
 setSelectedStyleKey: (value: string) => void;

 selectedFloorsKey: string;
 setSelectedFloorsKey: (value: string) => void;

 selectedHouseTypeKey: string;
 setSelectedHouseTypeKey: (value: string) => void;

 selectedFacadeKey: string;
 setSelectedFacadeKey: (value: string) => void;

 selectedRoofKey: string;
 setSelectedRoofKey: (value: string) => void;

 selectedRoofColorKey: string;
 setSelectedRoofColorKey: (value: string) => void;

 selectedSceneKey: string;
 setSelectedSceneKey: (value: string) => void;

 selectedToneKey: string;
 setSelectedToneKey: (value: string) => void;

 selectedGarageKey: string;
 setSelectedGarageKey: (value: string) => void;

 selectedSeasonKey: string;
 setSelectedSeasonKey: (value: string) => void;

 selectedPlot: string;
 onGenerate: () => void;
};

type OptionGroupProps = {
 label: string;
 options: string[];
 optionKeys: string[];
 selectedKey: string;
 onSelect: (value: string) => void;
 columnsClass: string;
 ui: UiSet;
};

const ROOM_KEYS = ["1", "2", "3", "4plus"];
const STYLE_KEYS = ["modern", "european", "chinese", "american"];
const FLOOR_KEYS = ["1", "2", "3"];
const HOUSE_TYPE_KEYS = ["detached", "semi_detached", "townhouse", "courtyard"];
const FACADE_KEYS = ["glass", "wood", "stone", "concrete", "white_wall"];
const ROOF_KEYS = ["flat", "sloped", "gable"];
const ROOF_COLOR_KEYS = ["black", "dark_gray", "brick_red", "deep_blue", "brown"];
const SCENE_KEYS = ["city", "suburb", "mountain", "seaside", "forest"];
const TONE_KEYS = ["light", "dark", "warm", "cool"];
const GARAGE_KEYS = ["with", "without"];
const SEASON_KEYS = ["spring", "summer", "autumn", "winter"];

function OptionGroup({
 label,
 options,
 optionKeys,
 selectedKey,
 onSelect,
 columnsClass,
 ui,
}: OptionGroupProps) {
 return (
 <div>
 <label className="mb-2 block text-sm font-medium text-neutral-700">
 {label}
 </label>
 <div className={`grid ${columnsClass} gap-2 text-sm`}>
 {options.map((item, idx) => {
 const optionKey = optionKeys[idx];
 const isActive = selectedKey === optionKey;

 return (
 <button
 key={optionKey}
 type="button"
 onClick={() => onSelect(optionKey)}
 className={`${isActive ? ui.btnPrimary : ui.btnSecondary} px-3 py-2`}
 >
 {item}
 </button>
 );
 })}
 </div>
 </div>
 );
}

export default function QuickCreatePanel({
 t,
 ui,
 area,
 setArea,
 selectedRoomsKey,
 setSelectedRoomsKey,
 selectedStyleKey,
 setSelectedStyleKey,
 selectedFloorsKey,
 setSelectedFloorsKey,
 selectedHouseTypeKey,
 setSelectedHouseTypeKey,
 selectedFacadeKey,
 setSelectedFacadeKey,
 selectedRoofKey,
 setSelectedRoofKey,
 selectedRoofColorKey,
 setSelectedRoofColorKey,
 selectedSceneKey,
 setSelectedSceneKey,
 selectedToneKey,
 setSelectedToneKey,
 selectedGarageKey,
 setSelectedGarageKey,
 selectedSeasonKey,
 setSelectedSeasonKey,
 selectedPlot,
 onGenerate,
}: QuickCreatePanelProps) {
 return (
 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
 <div className="mb-4 flex items-center justify-between">
 <h3 className="text-base font-semibold">{t.quickCreate}</h3>
 </div>

 <div className="space-y-4">
 <div>
 <label className="mb-2 block text-sm font-medium text-neutral-700">
 {t.inputArea}
 </label>
 <input
 value={area}
 onChange={(e) => setArea(e.target.value)}
 className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none"
 />
 </div>

 <OptionGroup
 label={t.inputRooms}
 options={t.roomOptions}
 optionKeys={ROOM_KEYS}
 selectedKey={selectedRoomsKey}
 onSelect={setSelectedRoomsKey}
 columnsClass="grid-cols-4"
 ui={ui}
 />

 <OptionGroup
 label={t.inputStyle}
 options={t.styleOptions}
 optionKeys={STYLE_KEYS}
 selectedKey={selectedStyleKey}
 onSelect={setSelectedStyleKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.floorCount}
 options={t.floorOptions}
 optionKeys={FLOOR_KEYS}
 selectedKey={selectedFloorsKey}
 onSelect={setSelectedFloorsKey}
 columnsClass="grid-cols-3"
 ui={ui}
 />

 <OptionGroup
 label={t.houseType}
 options={t.houseTypeOptions}
 optionKeys={HOUSE_TYPE_KEYS}
 selectedKey={selectedHouseTypeKey}
 onSelect={setSelectedHouseTypeKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.facadeMaterial}
 options={t.facadeOptions}
 optionKeys={FACADE_KEYS}
 selectedKey={selectedFacadeKey}
 onSelect={setSelectedFacadeKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.roofType}
 options={t.roofOptions}
 optionKeys={ROOF_KEYS}
 selectedKey={selectedRoofKey}
 onSelect={setSelectedRoofKey}
 columnsClass="grid-cols-3"
 ui={ui}
 />

 <OptionGroup
 label={t.roofColor}
 options={t.roofColorOptions}
 optionKeys={ROOF_COLOR_KEYS}
 selectedKey={selectedRoofColorKey}
 onSelect={setSelectedRoofColorKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.sceneType}
 options={t.sceneOptions}
 optionKeys={SCENE_KEYS}
 selectedKey={selectedSceneKey}
 onSelect={setSelectedSceneKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.tonePreference}
 options={t.toneOptions}
 optionKeys={TONE_KEYS}
 selectedKey={selectedToneKey}
 onSelect={setSelectedToneKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.garageOption}
 options={t.garageOptions}
 optionKeys={GARAGE_KEYS}
 selectedKey={selectedGarageKey}
 onSelect={setSelectedGarageKey}
 columnsClass="grid-cols-2"
 ui={ui}
 />

 <OptionGroup
 label={t.seasonOption}
 options={t.seasonOptions}
 optionKeys={SEASON_KEYS}
 selectedKey={selectedSeasonKey}
 onSelect={setSelectedSeasonKey}
 columnsClass="grid-cols-4"
 ui={ui}
 />

 <div>
 <label className="mb-2 block text-sm font-medium text-neutral-700">
 {t.plotLocation}
 </label>
 <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900">
 {selectedPlot || "-"}
 </div>
 </div>

 <button
 type="button"
 onClick={onGenerate}
 className={`${ui.btnPrimary} w-full px-4 py-3 text-sm font-semibold`}
 >
 {t.createDream}
 </button>
 </div>
 </div>
 );
}