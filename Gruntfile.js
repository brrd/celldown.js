module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        coffee: {
            build: {
                files: {
                    'dist/celldown.js': 'src/celldown.coffee'
                }
            },
            dev: {
                options: {
                    sourceMap: true
                },
                files: {
                    'dist/celldown.js': 'src/celldown.coffee'
                }
            }
        },
        uglify: {
            options: {
                banner: '/*\n\t<%= pkg.name %> - version <%= pkg.version %>\n*/\n'
            },
            build: {
                src: 'dist/celldown.js',
                dest: 'dist/celldown.min.js'
            }
        },
        watch: {
            scripts: {
                files: ['src/*.coffee'],
                tasks: ['default'],
                options: {
                    spawn: false,
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['coffee:build', 'uglify']);
};
