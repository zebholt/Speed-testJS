/*
 * *
 *  Copyright 2014 Comcast Cable Communications Management, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * /
 */
(function () {
    'use strict';
    //setting the initialization method for latency test suite
    var oldOnload = window.onload;
    window.onload = function () {
        void (oldOnload instanceof Function && oldOnload());
        //init for test
        initTest();
    };

    var testRunner = [];
    var currentInterval;
    var testButtonText = 'Start';
    var testPlan;
    var myChart;
    var option;
    var startTestButton;
    var firstRun = true;
    var downloadSize = 1000000;
    var uploadSize = 50000;

    function initTest() {
        function addEvent(el, ev, fn) {
            void (el.addEventListener && el.addEventListener(ev, fn, false));
            void (el.attachEvent && el.attachEvent('on' + ev, fn));
            void (!(el.addEventListener || el.attachEvent) && function (el, ev) { el['on' + ev] = fn } (el, ev));
        }
        startTestButton = document.querySelector(".action-start");
        addEvent(startTestButton, 'click', function () {
            startTest();
        });
        getTestPlan(function (testPlan) {
/*
            //initialize speedometer
            myChart = echarts.init(document.querySelector('.speed-gauge'));
            option = {
                series: [
                    {
                        name: 'Download',
                        type: 'gauge',
                        min: 0,
                        max: 1000,
                        precision: 2,
                        axisLine: {
                            show: true,
                            lineStyle: {
                                color: [[0.1, '#ff4500'], [0.3, '#ffa700'], [1, '#5bc942']],
                                width: 30,
                                type: 'solid'
                            }
                        },
                        axisTick: {
                            show: true,
                            splitNumber: 5,
                            length: 8,
                            lineStyle: {
                                color: '#000',
                                width: 1,
                                type: 'solid'
                            }
                        },
                        detail: {
                            formatter: '{value}',
                            show: false,
                            backgroundColor: 'rgba(0,0,0,0)',
                            borderWidth: 0,
                            borderColor: '#ccc',
                            width: 100,
                            height: 20,
                            offsetCenter: [0, '40%'],
                            textStyle: {
                                color: 'auto',
                                fontSize: 20
                            }
                        },
                        data: [{ value: 0, name: '' }]
                    }
                ]
            };

            option.series[0].data[0].value = 0;
            option.series[0].data[0].name = '';
            option.series[0].detail.formatter = '';
            myChart.setOption(option, true);
*/
            //show ipv6 fields if supported
            var resultsEl = document.querySelectorAll('.IPv6');
            if (testPlan.hasIPv6) {
                for (var i = 0; i < resultsEl.length; i++) {
                    removeClass(resultsEl[i], 'hide');
                }
            }

            //latencyTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4');

        });
    }

    function hasClass(el, className) {
        return (el.classList) ? el.classList.contains(className) : !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
    }

    function addClass(el, className) {
        if (!hasClass(el, className)) {
            el.className += " " + className;
            return;
        }
        void (el.classList && el.classList.add(className));
    }

    function removeClass(el, className) {
        if (hasClass(el, className)) {
            var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
            el.className = el.className.replace(reg, ' ');
            return;
        }
        void ((el.classList) && el.classList.remove(className));
    }

    function updateCurrentValue(currentLabel, currentValue) {
        return function () {
            option.series[0].data[0].value = currentValue;
            option.series[0].data[0].name = currentLabel;
            myChart.setOption(option, true);
        };
    }

    function getTestPlan(func) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var data = JSON.parse(xhr.responseText);
                testPlan = data;
                if (testPlan.performLatencyRouting) {
                    latencyBasedRouting();
                }
                void ((func && func instanceof Function) && func(data));
            }
        };
        xhr.open('GET', '/testplan', true);
        xhr.send(null);
    }

    function latencyBasedRoutingOnComplete(result) {
	console.log('Routing Complete');
        //TODO update the base urls for websockets if you want to perform the latency test via websockets
        testPlan.baseUrlIPv4 = result.IPv4Address;
        testPlan.baseUrlIPv6 = result.IPv6Address;
    }

    function latencyBasedRoutingOnError(result) {
        console.log(result);
    }

    function latencyBasedRouting() {
        // pass in the client location instead of the hard coded value
        var latencyBasedRouting = new window.latencyBasedRouting('NJ', latencyBasedRoutingOnComplete, latencyBasedRoutingOnError);
        latencyBasedRouting.getNearestServer();
    }

    function startTest() {

	console.log('Starting test');
        if (firstRun) {
            firstRun = false;
        } else {
            var resultsEl = document.querySelectorAll('.test-result');
            for (var i = 0; i < resultsEl.length; i++) {
                resultsEl[i].innerHTML = '';
            }
        }
        
        setTimeout(downloadProbe(),500);
        //update button text to communicate current state of test as In Progress
        startTestButton.innerHTML = 'Testing in Progress ...';
        //disable button
        startTestButton.disabled = true;
        //set accessiblity aria-disabled state. 
        //This will also effect the visual look by corresponding css
        startTestButton.setAttribute('aria-disabled', true);
    }

    function formatSpeed(value) {
        var value = parseFloat(Math.round(value * 100) / 100).toFixed(2);
        value = (value > 1000) ? parseFloat(value / 1000).toFixed(2) + ' Gbps' : value + ' Mbps';
        return value;
    }

    function latencyTest(version) {
        var currentTest = 'latency';
/*
        option.series[0].data[0].value = 0;
        option.series[0].data[0].name = '';
        option.series[0].detail.formatter = '{value} ms';
        option.series[0].detail.show = false;
        myChart.setOption(option, true);
*/
        function latencyHttpOnComplete(result) {
	    console.log('Routing Complete');

            result = result.sort(function (a, b) {
                return +a.time - +b.time;
            });

            if(version === 'IPv6'){
                setTimeout(latencyTest('IPv4'),500);
            }
            else{
                updateValue(currentTest, result[0].time + ' ms');
            }

        }

        function latencyHttpOnProgress() {
        }

        function latencyHttpOnAbort(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                latencyTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        function latencyHttpOnTimeout(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                latencyTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        function latencyHttpOnError(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                latencyTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        var baseUrl = (version === 'IPv6') ? 'http://' + testPlan.baseUrlIPv6 + '/latency' : 'http://' + testPlan.baseUrlIPv4 + '/latency';

        var latencyHttpTestSuite = new window.latencyHttpTest(baseUrl, 10, 3000, latencyHttpOnComplete, latencyHttpOnProgress,
            latencyHttpOnAbort, latencyHttpOnTimeout, latencyHttpOnError);
        latencyHttpTestSuite.initiateTest();
    }

    function updateValue(selector, value) {
        var sel = ['.', selector, '-result'].join('');
        console.log('Updating ' + sel + ' with ' + value);
        var dom = document.querySelector(sel);

        if (dom) {
            dom.innerHTML = value;
        }
    }

    function downloadProbe() {
        $('.download-IPv4-result').text('Initializing...');
        $('#download-progress').removeClass('stop');
        function downloadProbeTestOnComplete(result) {
            var downloadSizes = result;
            if(downloadSizes.length>0) {
                //downloadSize = downloadSizes[downloadSizes.length-1];
                downloadSize = downloadSizes[0];
            }
            //call downloadTests
            void (!(testPlan.hasIPv6 === 'IPv6') && setTimeout(function () { !firstRun && downloadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));
        }

        function downloadProbeTestOnError(result) {
            //use default value for download testing
            void (!(testPlan.hasIPv6 === 'IPv6') && setTimeout(function () { downloadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));
        }
        var downloadProbeTestRun = new window.downloadProbeTest('/download?bufferSize='+downloadSize, '/downloadProbe', false, 30000,762939,downloadProbeTestOnComplete,
            downloadProbeTestOnError);
        downloadProbeTestRun.start();

    }

    function downloadTest(version) {
        var currentTest = 'download';
	console.log('DownloadTest');
/*
        option.series[0].data[0].value = 0;
        option.series[0].data[0].name = 'Testing Download ...';
        option.series[0].detail.formatter = formatSpeed;
        option.series[0].detail.show = true;
        myChart.setOption(option, true);
*/
        function calculateStatsonComplete(result) {
            console.log('Calculating stats for ' + currentTest);
            var finalValue = parseFloat(Math.round(result.stats.mean * 100) / 100).toFixed(2);
            var statusClass = (finalValue > 1) ? 'pass' : 'fail';
	    $('#download-card').addClass(statusClass);
            finalValue = (finalValue > 1000) ? parseFloat(finalValue / 1000).toFixed(2) + ' Gbps' : finalValue + ' Mbps';
            void (version === 'IPv6' && downloadTest('IPv4'));
            uploadProbe();
            //void (!(version === 'IPv6') && uploadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'));
            updateValue([currentTest, '-', version].join(''), finalValue);
	    window['processComplete'] && processComplete();
        }

        function calculateStatsonError(result) {
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        function downloadHttpOnComplete(result) {
            console.log('Download Test Complete '+result);
	    $('#download-progress').addClass('stop');
      
            var calculateMeanStats = new window.calculateStats(result, calculateStatsonComplete, calculateStatsonError);
            calculateMeanStats.performCalculations();
        }

        function downloadHttpOnProgress(result) {
            console.log('Downloading...');
            updateValue([currentTest, '-', version].join(''), (Math.round(result * 100) / 100));
/*
            option.series[0].data[0].value = result;
            myChart.setOption(option, true);
*/
        }

        function downloadHttpOnAbort(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                downloadTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        function downloadHttpOnTimeout(result) {
		console.log('downloadHttpOnTimeout');
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                downloadTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        function downloadHttpOnError(result) {
		console.log('downloadHttpOnError '+result);
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                downloadTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }

        var baseUrl = (version === 'IPv6') ? 'http://' + testPlan.baseUrlIPv6 : 'http://' + testPlan.baseUrlIPv4;

        var downloadHttpConcurrentProgress = new window.downloadHttpConcurrentProgress(baseUrl + '/download?bufferSize='+downloadSize, 'GET', 6, 15000, 15000,10, downloadHttpOnComplete, downloadHttpOnProgress,
            downloadHttpOnAbort, downloadHttpOnTimeout, downloadHttpOnError);
        downloadHttpConcurrentProgress.initiateTest();
    }

    function uploadProbe() {
	console.log('Upload Probe begin');
        $('.upload-IPv4-result').text('Initializing...');
        $('#upload-progress').removeClass('stop');
        function uploadProbeTestOnComplete(result) {
            if (result) {
                uploadSize = result;
            }

            void (!(testPlan.hasIPv6 === 'IPv6') && setTimeout(function () { !firstRun && uploadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));
        }

        function uploadProbeTestOnError(result) {

            void (!(testPlan.hasIPv6 === 'IPv6') && setTimeout(function () { !firstRun && uploadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));
        }

        var uploadProbeTestRun = new window.uploadProbeTest('/upload', '/uploadProbe', false, 3000, 194872, uploadProbeTestOnComplete, uploadProbeTestOnError);
        uploadProbeTestRun.start();
    }

    function uploadTest(version) {
	console.log('Upload Test begin');
        $('#upload-progress').removeClass('stop');
        var currentTest = 'upload';
/*
        option.series[0].data[0].value = 0;
        option.series[0].data[0].name = 'Testing Upload...';
        option.series[0].detail.formatter = formatSpeed;
        myChart.setOption(option, true);
*/
        function calculateStatsonComplete(result) {
            var finalValue = parseFloat(Math.round(result.stats.mean * 100) / 100).toFixed(2);
            var statusClass = (finalValue > 1) ? 'pass' : 'fail';
	    $('#upload-card').addClass(statusClass);
            finalValue = (finalValue > 1000) ? parseFloat(finalValue / 1000).toFixed(2) + ' Gbps' : finalValue + ' Mbps';
            void ((version === 'IPv6') && uploadTest('IPv4'));
            if (!(version === 'IPv6')) {
                //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Complete';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
            }

            updateValue([currentTest, '-', version].join(''), finalValue);
        }

        function calculateStatsonError(result) {
            startTestButton.disabled = false;
            //update button text to communicate current state of test as In Progress
            startTestButton.innerHTML = 'Start Test';
        }
        function uploadHttpOnComplete(result) {
            console.log('Upload Test Complete');
	    $('#upload-progress').addClass('stop');
            var calculateMeanStats = new window.calculateStats(result, calculateStatsonComplete, calculateStatsonError);
            calculateMeanStats.performCalculations();
        }
        function uploadHttpOnProgress(result) {
            console.log('Uploading...');
            updateValue([currentTest, '-', version].join(''), (Math.round(result * 100) / 100));
/*
            option.series[0].data[0].value = result;
            myChart.setOption(option, true);
*/
        }
        function uploadHttpOnAbort(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                uploadTest('IPv4');
                return;
            }
                console.log('Upload Aborted');
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }
        function uploadHttpOnTimeout(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                uploadTest('IPv4');
                return;
            }
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }
        function uploadHttpOnError(result) {
            if (version === 'IPv6') {
                testPlan.hasIPv6 = false;
                uploadTest('IPv4');
                return;
            }
                console.log('Upload Error');
/*
                //set test value to 0
                option.series[0].data[0].value = 0;
                //updat test status to complete
                option.series[0].data[0].name = 'Test Failed';
                //set accessiblity aria-disabled state. 
                //This will also effect the visual look by corresponding css
                startTestButton.setAttribute('aria-disabled', false);
               //update button text to communicate current state of test as In Progress
                startTestButton.innerHTML = 'Start Test';
                //enable start button
                startTestButton.disabled = false;
                //hide current test value in chart 
                option.series[0].detail.show = false;
                //update gauge
                myChart.setOption(option, true);
*/
        }
        var baseUrl = (version === 'IPv6') ? 'http://' + testPlan.baseUrlIPv6 : 'http://' + testPlan.baseUrlIPv4;

        var uploadHttpConcurrentTestSuite = new window.uploadHttpConcurrentProgress(baseUrl + '/upload', 'POST', 1, 15000, 15000, 2, uploadHttpOnComplete, uploadHttpOnProgress,
            uploadHttpOnError, uploadSize);
        uploadHttpConcurrentTestSuite.initiateTest();
console.log('uploadHttpConcurrentTestSuite.initiateTest()');

    }

})();
