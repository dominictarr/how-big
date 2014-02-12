#! /usr/bin/env node

var pt = require('pull-traverse')
var pull = require('pull-stream')
var pfs = require('pull-fs')
var fs = require('fs')

function howBig (dir, cb) {

  fs.lstat(dir, function (err, stat) {
    stat.file = dir
    pull(
      pt.leafFirst(stat, function (stat) {
        return pull(
          pfs.readdir(stat.file),
          pfs.relative(dir),
          pull.asyncMap(function (file, cb) {
            fs.lstat(file, function (err, stat) {
              if(!stat.isFile() && !stat.isDirectory()) return cb(null, null)
              if(stat.isSymbolicLink()) return cb(null, null)
              cb(err, {file: file, size: stat.size})
            })
          }),
          pull.filter()
        )
      }),
      pull.filter(),
      pull.reduce(function (acc, stat) {
        var f = stat.file.split('/').shift()
        if(f)
          acc[f] = (acc[f] || 0) + stat.size
        return acc
      }, {}, function (err, ob) {
        if(err) return cb(err)
        var s = [], o = {}
        for(var k in ob) {
          s.push({k: k, v: ob[k]})
        }
        s.sort(function (a, b) {
          return a.v - b.v
        }).forEach(function (i) {
          o[i.k] = i.v/1000000
        })
        cb(null, o)

      })
    )
  })

}

if(!module.parent)
  howBig(process.argv[2] || process.cwd(), function (err, ag) {
    if(err) throw err
    console.log(JSON.stringify(ag, null, 2))
  })
