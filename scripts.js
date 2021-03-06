window.onload = function () {
	const table = document.querySelector("main table tbody");
	const keyword_input = document.querySelector("input[type=\"text\"]");
	const form = document.getElementsByTagName("form")[0];
	const reqA_input = document.getElementById("req-a");
	const reqB_input = document.getElementById("req-b");
	const reqC_input = document.getElementById("req-c");

	let submitButton = document.getElementById("submit");
	let clearButton = document.getElementById("clear");
	const downloadLink = document.getElementById("download");

	// checkbox
	const checkName = document.getElementById("check-name");
	const checkNo = document.getElementById("check-no");
	const checkPerson = document.getElementById("check-person");
	const checkRoom = document.getElementById("check-room");
	const checkAbstract = document.getElementById("check-abstract");

	const updatedDate = document.getElementById("updated-date");

	// if the device is iOS, displayed lines are limited 500.
	const isIOS = ["iPhone", "iPad", "iPod"].some(name => navigator.userAgent.indexOf(name) > -1);
	const lineLimit = 500;

	// if the device width is under 1100px
	const isUnder1100px = window.matchMedia("screen and (max-width: 1100px)").matches;
	let selectModule, selectDay, selectPeriod;

	if (isUnder1100px) {
		selectModule = document.getElementById("select-module");
		selectDay = document.getElementById("select-day");
		selectPeriod = document.getElementById("select-period");
		submitButton = document.getElementById("submit-sp");
		clearButton = document.getElementById("clear-sp");
	} 

	// updated date
	const updated = "2021/04/19";
	updatedDate.innerHTML = updated;

	let codeTypes = null;
	let data = null;
	let timeout = void 0;

	keyword_input.addEventListener("keydown", (evt) => {
		const KEYCODE_ENTER = 13;
		if (evt.keyCode === KEYCODE_ENTER) {
			evt.preventDefault();
			search(evt);
		}
	});

	clearButton.addEventListener('click', (evt) => {
		evt.stopPropagation();
		keyword_input.value = "";
		reqA_input.selectedIndex = 0;
		form.season.value = "null";
		form.module.value = "null";
		form.day.value = "null";
		form.period.value = "null";
		form.online.value = "null";
		form.year.value = "null";

		checkName.checked = true;
		checkNo.checked = true;
		checkPerson.checked = false;
		checkRoom.checked = false;
		checkAbstract.checked = false;
	});

	// display a line of the table
	const createLine = (line) => {
		let tr = document.createElement("tr");
		table.appendChild(tr);

		let url = `https://kdb.tsukuba.ac.jp/syllabi/2021/${line[0]}/jpn`;
		let methods = ["??????", "??????????????????", "???????????????"].filter(it => line[10].indexOf(it) > -1);

		tr.innerHTML += `<td>${line[0]}<br/>${line[1]}<br/><a href="${url}" class="syllabus" target="_blank">????????????</a></td>`;
		tr.innerHTML += `<td>${line[3]}??????<br/>${line[4]}??????</td>`;
		tr.innerHTML += `<td>${line[5]}<br/>${line[6]}</td>`;
		tr.innerHTML += `<td>${line[7].replace(/,/g, "<br/>")}</td>`;
		tr.innerHTML += `<td>${line[8].replace(/,/g, "<br/>")}</td>`;

		if (methods.length < 1)
			tr.innerHTML += "<td>??????</td>"
		else
			tr.innerHTML += `<td>${methods.join('<br/>')}<br /></td>`;

		tr.innerHTML += `<td>${line[9]}</td>`;
		tr.innerHTML += `<td>${line[10]}</td>`;
	}


	// update the table
	const updateTable = (options, index, displayedIndex) => {
		let regex = new RegExp(options.keyword);

		index = typeof index === 'undefined' ? 0 : index;
		displayedIndex = typeof displayedIndex === "undefined" ? 0 : displayedIndex;

		if (isIOS && displayedIndex >= lineLimit)
			return;

		for (; ;) {
			const line = data[index];

			if (typeof line === 'undefined') {
				return;
			}

			// keyword
			let matchesNo = checkNo.checked ? line[0].indexOf(options.keyword) != 0 : true;
			let matchesName = checkName.checked ? line[1].match(regex) == null : true;
			let matchesRoom = checkRoom.checked ? line[7].match(regex) == null : true;
			let matchesPerson = checkPerson.checked ? line[8].match(regex) == null : true;
			let matchesAbstract = checkAbstract.checked ? line[9].match(regex) == null : true;

			let matchesKeyword = options.keyword != "" &&
				(matchesNo && matchesName && matchesRoom && matchesPerson && matchesAbstract);

			// other options
			let missMatchesSeason = options.season != "null" && line[5].indexOf(options.season) < 0;
			let missMatchesModule = options.module_ != "null" && line[5].indexOf(options.module_) < 0;
			let missMatchesDay = options.day != "null" && line[6].indexOf(options.day) < 0;
			let missMatchesPeriod = options.period != "null" && line[6].indexOf(options.period) < 0;
			let missMatchesOnline = options.online != "null" && line[10].indexOf(options.online) < 0;

			let missMatchesYear;
			if (line[4].indexOf("-") < 0) {
				missMatchesYear = options.year != "null" && line[4].indexOf(options.year) < 0;
			} else {
				let minYear = line[4].replace(/\s-\s[1-6]/g, "");
				let maxYear = line[4].replace(/[1-6]\s-\s/g, "");
				missMatchesYear = options.year != "null" && (options.year < minYear || maxYear < options.year);
			}

			let missMatchesReq_A = options.reqA != "null" && options.reqA != line[11];
			let missMatchesReq_B = options.reqB != "null" && options.reqB != line[12];
			let missMatchesReq_C = options.reqC != "null" && options.reqC != line[13];

			//console.log(missMatchesReq_A, missMatchesReq_B, missMatchesReq_C)
			if (
				matchesKeyword ||
				missMatchesSeason ||
				missMatchesModule ||
				missMatchesDay ||
				missMatchesPeriod ||
				missMatchesOnline ||
				missMatchesYear ||
				(missMatchesReq_A || missMatchesReq_B || missMatchesReq_C)) {
				index++;
				continue;
			}

			createLine(line);
			timeout = setTimeout(() => updateTable(options, index + 1, ++displayedIndex), 0);
			break;
		}
	}

	// convert table data to CSV file with utf-8 BOM
	const makeCSV = (a, table_, filename) => {
		var escaped = /,|\r?\n|\r|"/;
		var e = /"/g;

		var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
		var csv = [], row = [], field, r, c;
		for (r=0;  r<table_.rows.length; r++) {
			row.length = 0;
			for (c=0; c<table_.rows[r].cells.length; c++) {
				field = table_.rows[r].cells[c].innerText.trim();
				if (r !== 0 && c === 0) {
					field = field.slice(0,-5);
				}
				row.push(escaped.test(field)? '"' + field.replace(e, '""') + '"' : field);
		 	}
			csv.push(row.join(','));
		}
		var blob = new Blob([bom, csv.join('\n')], {'type': 'text/csv'});

		if (window.navigator.msSaveBlob) {
			// IE
			window.navigator.msSaveBlob(blob, filename);
		} else {
			a.download = filename;
			a.href = window.URL.createObjectURL(blob);
		}
	}

	// download CSV file: `kdb_YYYYMMDDhhmmdd.csv`
	const downloadCSV = () => {
		makeCSV(
			downloadLink, document.querySelector("main table"), `kdb_${getDateString()}.csv`);
	}

	// get YYYYMMDDhhmmdd
	const getDateString = () => {
		let date = new Date();
		let Y = date.getFullYear();
		let M = ("00" + (date.getMonth()+1)).slice(-2);
		let D = ("00" + date.getDate()).slice(-2);
		let h = ('0' + date.getHours()).slice(-2);
		let m = ('0' + date.getMinutes()).slice(-2);
		let d = ('0' + date.getSeconds()).slice(-2);

		return Y + M + D + h + m + d;
	  }

	// search
	const search = (e) => {
		// clear tbody contents
		table.innerHTML = '';
		
		if (e !== null) {
			e.stopPropagation();
		}
		let options = {};

		options.keyword = keyword_input.value;
		options.reqA = reqA_input.options[reqA_input.selectedIndex].value;
		options.reqB = reqB_input.selectedIndex > -1 ? reqB_input.options[reqB_input.selectedIndex].value : "null";
		options.reqC = reqC_input.selectedIndex > -1 ? reqC_input.options[reqC_input.selectedIndex].value : "null";
		options.online = form.online.value;
		options.year = form.year.value;

		if (isUnder1100px) {
			let seasonModule = selectModule.options[selectModule.selectedIndex].value;
			if (seasonModule == "null") {
				options.season = "null";
				options.module_ = "null";
			}
			else {
				options.season = seasonModule.slice(0,1);
				options.module_ = seasonModule.slice(1);
			}
			options.day = selectDay.options[selectDay.selectedIndex].value;
			options.period = selectPeriod.options[selectPeriod.selectedIndex].value;
		}
		else {
			options.season = form.season.value;
			options.module_ = form.module.value;
			options.day = form.day.value;
			options.period = form.period.value;
		}

		clearTimeout(timeout);

		updateTable(options);
	}

	submitButton.onclick = search;
	downloadLink.onclick = downloadCSV;


	const constructOptions = (select, types) => {
		deleteOptions(select);
		{
			let option = document.createElement("option");
			option.value = "null";
			option.innerHTML = "????????????";
			select.appendChild(option);
		}
		for (let key in types) {
			let option = document.createElement("option");
			option.innerHTML = key;
			select.appendChild(option);
		}
	}

	const deleteOptions = (select) => {
		select.innerHTML = "";
	}

	const selectOnChange = (isA) => {
		deleteOptions(reqC_input);
		const selected = isA ? reqA_input : reqB_input;
		const selectedValue = selected.options[selected.selectedIndex].value;
		const subSelect = isA ? reqB_input : reqC_input;
		const reqA_value = reqA_input.options[reqA_input.selectedIndex].value;
		const reqB_value = reqB_input.selectedIndex > -1 ? reqB_input.options[reqB_input.selectedIndex].value : "null";

		if (selectedValue == "null") {
			deleteOptions(subSelect);
		}
		else {
			let types = isA ? codeTypes[reqA_value] : codeTypes[reqA_value].childs[reqB_value];
			constructOptions(subSelect, types.childs);
		}
	}

	
	// initialize
	(async () => {
		// construct options of requirements
		let response = await fetch("code-types.json");
		codeTypes = await response.json();
		constructOptions(reqA_input, codeTypes);
		reqA_input.addEventListener("change", () => selectOnChange(true));
		reqB_input.addEventListener("change", () => selectOnChange(false));

		// read a json
		response = await fetch("kdb.json");
		data = await response.json();
		search(null);
	})();
};
